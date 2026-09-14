import prisma from '../config/database.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/errors.js';
import * as configService from './config.service.js';
import * as auditService from './audit.service.js';

export async function checkout(username, barcode, librarianUserId) {
  return await prisma.$transaction(async (tx) => {
    const librarian = await tx.librarian.findUnique({
      where: { librarianId: BigInt(librarianUserId) }
    });

    if (!librarian) {
      throw new ForbiddenError('User is not a librarian');
    }

    const user = await tx.user.findUnique({
      where: { username },
      include: { member: true }
    });

    if (!user || !user.member) {
      throw new NotFoundError('Member not found');
    }

    const member = user.member;
    member.user = user;

    if (member.user.status !== 'Active') {
      throw new BadRequestError('Member account not active');
    }

    const activeLoansCount = await tx.loan.count({
      where: {
        memberId: member.memberId,
        status: 'Active'
      }
    });

    if (activeLoansCount >= member.borrowingLimit) {
      throw new BadRequestError('Borrowing limit exceeded');
    }

    const loanPeriodDays = await configService.getAsNumber('loan_period_days');

    const updateResult = await tx.bookCopy.updateMany({
      where: {
        barcode,
        status: 'Available'
      },
      data: {
        status: 'Loaned'
      }
    });

    if (updateResult.count === 0) {
      throw new ConflictError('COPY_NOT_AVAILABLE');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriodDays);

    const loan = await tx.loan.create({
      data: {
        memberId: member.memberId,
        barcode,
        dueDate,
        status: 'Active',
        issuedById: librarian.librarianId,
        renewalCount: 0
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        copy: {
          include: {
            book: true
          }
        }
      }
    });

    await auditService.log({
      userId: librarianUserId,
      action: 'CHECKOUT',
      entityType: 'Loan',
      entityId: loan.loanId.toString()
    }, tx);

    return loan;
  });
}

export async function checkin(loanId, librarianUserId, condition = 'Good') {
  return await prisma.$transaction(async (tx) => {
    const librarian = await tx.librarian.findUnique({
      where: { librarianId: BigInt(librarianUserId) }
    });

    if (!librarian) {
      throw new ForbiddenError('User is not a librarian');
    }

    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });

    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (loan.status !== 'Active') {
      throw new BadRequestError('Loan already returned');
    }

    const returnDate = new Date();
    const updatedLoan = await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        status: 'Returned',
        returnDate,
        returnedToId: librarian.librarianId
      },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });

    let fine = null;
    const overdueDays = Math.max(
      0,
      Math.floor((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24))
    );

    if (overdueDays > 0) {
      const fineRate = await configService.getAsNumber('fine_rate_per_day');
      const amount = overdueDays * fineRate;

      fine = await tx.fine.create({
        data: {
          loanId: loan.loanId,
          memberId: loan.memberId,
          amount,
          reason: 'Overdue',
          status: 'Unpaid'
        }
      });
    }

    const pendingReservations = await tx.reservation.findMany({
      where: {
        isbn: loan.copy.isbn,
        status: 'Pending'
      },
      orderBy: { reserveDate: 'asc' },
      take: 1
    });

    let reservation = null;
    let newCopyStatus = condition === 'Damaged' ? 'Repair' : 'Available';

    if (condition !== 'Damaged' && pendingReservations.length > 0) {
      const holdDays = await configService.getAsNumber('reservation_hold_days');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + holdDays);

      reservation = await tx.reservation.update({
        where: { reserveId: pendingReservations[0].reserveId },
        data: {
          status: 'Fulfilled',
          expiryDate
        }
      });

      newCopyStatus = 'Reserved';

      await tx.notification.create({
        data: {
          userId: reservation.memberId,
          type: 'ReservationReady',
          channel: 'Email',
          content: `Your reserved book "${loan.copy.book.title}" is ready for pickup`,
          status: 'Pending'
        }
      });
    }

    await tx.bookCopy.update({
      where: { barcode: loan.barcode },
      data: {
        status: newCopyStatus,
        condition: condition === 'Damaged' ? 'Poor' : condition
      }
    });

    await auditService.log({
      userId: librarianUserId,
      action: 'CHECKIN',
      entityType: 'Loan',
      entityId: loan.loanId.toString()
    }, tx);

    return { loan: updatedLoan, fine, reservation };
  });
}

export async function renew(loanId, memberId) {
  return await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { loanId: BigInt(loanId) },
      include: { copy: true }
    });

    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (loan.status !== 'Active') {
      throw new BadRequestError('Cannot renew returned loan');
    }

    if (loan.memberId.toString() !== memberId) {
      throw new ForbiddenError('Not your loan');
    }

    const maxRenewals = await configService.getAsNumber('max_renewals');
    if (loan.renewalCount >= maxRenewals) {
      throw new BadRequestError('Maximum renewals reached');
    }

    const pendingReservation = await tx.reservation.findFirst({
      where: {
        isbn: loan.copy.isbn,
        status: 'Pending'
      }
    });

    if (pendingReservation) {
      throw new BadRequestError('Cannot renew: book has pending reservation');
    }

    const fineThreshold = await configService.getAsNumber('fine_block_threshold');
    const totalUnpaid = await tx.fine.aggregate({
      where: {
        memberId: BigInt(memberId),
        status: 'Unpaid'
      },
      _sum: { amount: true }
    });

    const unpaidAmount = Number(totalUnpaid._sum.amount || 0);
    if (unpaidAmount > fineThreshold) {
      throw new BadRequestError('Cannot renew: unpaid fines exceed threshold');
    }

    const loanPeriodDays = await configService.getAsNumber('loan_period_days');
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + loanPeriodDays);

    return await tx.loan.update({
      where: { loanId: loan.loanId },
      data: {
        dueDate: newDueDate,
        renewalCount: loan.renewalCount + 1
      },
      include: {
        copy: {
          include: {
            book: true
          }
        }
      }
    });
  });
}

export async function getMemberLoans(memberId, status) {
  const where = {
    memberId: BigInt(memberId)
  };

  if (status) {
    where.status = status;
  } else {
    where.status = 'Active';
  }

  return await prisma.loan.findMany({
    where,
    include: {
      copy: {
        include: {
          book: {
            select: {
              isbn: true,
              title: true,
              author: true
            }
          }
        }
      }
    },
    orderBy: { issueDate: 'desc' }
  });
}

export async function getMemberHistory(memberId) {
  return await prisma.loan.findMany({
    where: {
      memberId: BigInt(memberId),
      status: 'Returned'
    },
    include: {
      copy: {
        include: {
          book: {
            select: {
              title: true,
              author: true
            }
          }
        }
      }
    },
    orderBy: { returnDate: 'desc' }
  });
}

export async function getAllLoans(status) {
  const where = {};

  if (status) {
    where.status = status;
  }

  return await prisma.loan.findMany({
    where,
    include: {
      member: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      },
      copy: {
        include: {
          book: {
            select: {
              isbn: true,
              title: true,
              author: true
            }
          }
        }
      }
    },
    orderBy: { issueDate: 'desc' }
  });
}
