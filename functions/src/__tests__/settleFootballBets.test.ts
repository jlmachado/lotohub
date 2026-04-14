/**
 * Regression tests for settleFootballBets Cloud Function.
 *
 * The function is a Firestore onUpdate trigger on
 *   bancas/{bancaId}/football_matches/{matchId}
 *
 * It settles open football bets when a match status changes to FINISHED.
 */

/* ------------------------------------------------------------------ */
/*  Mocks – must be declared before any import that touches firebase  */
/* ------------------------------------------------------------------ */

// Firestore mock state – tests populate these before each run
let mockBetsSnapshot: { empty: boolean; docs: any[] } = { empty: true, docs: [] };
let mockMatchSnapshots: Record<string, { exists: boolean; data: () => any }> = {};
let mockUserSnapshots: Record<string, { exists: boolean; data: () => any }> = {};

// Spies to assert Firestore writes
const updateSpy = jest.fn();
const setSpy = jest.fn();
const transactionGetSpy = jest.fn();
const transactionUpdateSpy = jest.fn();
const transactionSetSpy = jest.fn();

const mockRunTransaction = jest.fn(async (cb: (t: any) => Promise<any>) => {
  const transaction = {
    get: transactionGetSpy,
    update: transactionUpdateSpy,
    set: transactionSetSpy,
  };
  return cb(transaction);
});

const mockWhere = jest.fn().mockReturnThis();
const mockGet = jest.fn(async () => mockBetsSnapshot);

jest.mock('firebase-admin', () => {
  const firestoreInstance = {
    collection: jest.fn().mockReturnValue({
      where: mockWhere,
      get: mockGet,
      doc: jest.fn().mockReturnValue({
        set: setSpy,
        update: updateSpy,
      }),
    }),
    doc: jest.fn((path: string) => {
      // Return the correct snapshot based on the document path
      return {
        get: jest.fn(async () => {
          // Match path to return the right snapshot
          if (path.includes('/football_matches/')) {
            const matchId = path.split('/football_matches/')[1];
            return mockMatchSnapshots[matchId] || { exists: false, data: () => ({}) };
          }
          if (path.includes('/usuarios/')) {
            const userId = path.split('/usuarios/')[1];
            return mockUserSnapshots[userId] || { exists: false, data: () => ({}) };
          }
          return { exists: false, data: () => ({}) };
        }),
        update: updateSpy,
        set: setSpy,
      };
    }),
    runTransaction: mockRunTransaction,
  };

  // Build the firestore callable that also carries static properties
  const firestoreFn: any = jest.fn(() => firestoreInstance);
  firestoreFn.FieldValue = {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    increment: jest.fn((n: number) => ({ _increment: n }),),
  };

  return {
    apps: [{}], // pretend already initialised
    initializeApp: jest.fn(),
    firestore: firestoreFn,
    __firestoreInstance: firestoreInstance, // expose for direct access
  };
});

jest.mock('firebase-functions', () => {
  // Capture the handler so we can invoke it directly in tests
  let _handler: any;
  return {
    firestore: {
      document: jest.fn().mockReturnValue({
        onUpdate: jest.fn((handler: any) => {
          _handler = handler;
          return handler; // return the handler itself as the export
        }),
      }),
    },
    // Helper to retrieve the captured handler
    __getHandler: () => _handler,
  };
});

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                             */
/* ------------------------------------------------------------------ */
import * as admin from 'firebase-admin';

// Importing the module will cause the onUpdate handler to be captured
// by our mock above.
import '../settleFootballBets';

// Retrieve the actual handler function
const functions = require('firebase-functions');
const handler = functions.__getHandler();

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeChange(beforeData: Record<string, any>, afterData: Record<string, any>) {
  return {
    before: { data: () => beforeData },
    after: { data: () => afterData },
  };
}

function makeContext(bancaId = 'banca1', matchId = 'match1') {
  return { params: { bancaId, matchId } };
}

function makeBetDoc(
  id: string,
  items: any[],
  overrides: Record<string, any> = {},
) {
  const data = {
    status: 'OPEN',
    items,
    potentialWin: 100,
    userId: 'user1',
    terminal: 'T1',
    tipoUsuario: 'jogador',
    id,
    ...overrides,
  };
  return {
    id,
    data: () => data,
    ref: { update: updateSpy },
  };
}

/* ------------------------------------------------------------------ */
/*  Reset state between tests                                         */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  jest.clearAllMocks();
  mockBetsSnapshot = { empty: true, docs: [] };
  mockMatchSnapshots = {};
  mockUserSnapshots = {};

  // Default: transaction.get resolves to a user with balance
  transactionGetSpy.mockImplementation(async (ref: any) => ({
    exists: true,
    data: () => ({ saldo: 500, nome: 'Test User', comissao: 10 }),
  }));
});

/* ================================================================== */
/*  TEST SUITES                                                       */
/* ================================================================== */

describe('settleFootballBets', () => {
  /* ------------------------------------------------------------ */
  /*  Guard: only fire when match transitions to FINISHED          */
  /* ------------------------------------------------------------ */
  describe('trigger guard', () => {
    it('should return null when status did not change to FINISHED', async () => {
      const change = makeChange(
        { status: 'IN_PLAY' },
        { status: 'IN_PLAY' },
      );
      const result = await handler(change, makeContext());
      expect(result).toBeNull();
    });

    it('should return null when match was already FINISHED before update', async () => {
      const change = makeChange(
        { status: 'FINISHED' },
        { status: 'FINISHED' },
      );
      const result = await handler(change, makeContext());
      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------ */
  /*  No open bets                                                 */
  /* ------------------------------------------------------------ */
  it('should return null when there are no open bets', async () => {
    mockBetsSnapshot = { empty: true, docs: [] };

    const change = makeChange(
      { status: 'IN_PLAY' },
      {
        status: 'FINISHED',
        homeTeam: 'A',
        awayTeam: 'B',
        scoreHome: 2,
        scoreAway: 1,
      },
    );
    const result = await handler(change, makeContext());
    expect(result).toBeNull();
  });

  /* ------------------------------------------------------------ */
  /*  Skip unrelated bets                                          */
  /* ------------------------------------------------------------ */
  it('should skip bets that do not contain the finished match', async () => {
    mockBetsSnapshot = {
      empty: false,
      docs: [
        makeBetDoc('bet-other', [
          { matchId: 'some-other-match', market: '1X2', selection: 'home' },
        ]),
      ],
    };

    const change = makeChange(
      { status: 'IN_PLAY' },
      {
        status: 'FINISHED',
        homeTeam: 'A',
        awayTeam: 'B',
        scoreHome: 2,
        scoreAway: 1,
      },
    );
    const result = await handler(change, makeContext());
    expect(result).toEqual({
      success: true,
      processadas: 0,
      vencedoras: 0,
      perdedoras: 0,
    });
  });

  /* ------------------------------------------------------------ */
  /*  1X2 market – home wins                                       */
  /* ------------------------------------------------------------ */
  describe('1X2 / Vencedor do Jogo market', () => {
    it('should settle bet as LOST when home is selected but away wins', async () => {
      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet1', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 0,
          scoreAway: 2,
        },
      );

      const result = await handler(change, makeContext());
      // Bet should have been updated as LOST
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'LOST',
          settledBy: 'SISTEMA_AUTO',
          finalPrize: 0,
        }),
      );
      expect(result.perdedoras).toBe(1);
      expect(result.vencedoras).toBe(0);
    });

    it('should settle single-selection bet as WON when home wins and home is selected', async () => {
      // The finished match IS the only match in the bet
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 3,
          scoreAway: 1,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-win', [
            { matchId: 'match1', market: 'Vencedor do Jogo', selection: 'Casa' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 3,
          scoreAway: 1,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
      expect(result.perdedoras).toBe(0);
      // settleBet should have been called with WON + potentialWin
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'WON',
          finalPrize: 100,
        }),
      );
    });

    it('should settle bet as WON when draw is selected and match is a draw', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 1,
          scoreAway: 1,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-draw', [
            { matchId: 'match1', market: '1X2', selection: 'draw' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 1,
          scoreAway: 1,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });

    it('should settle bet as WON when away is selected and away wins', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 0,
          scoreAway: 2,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-away', [
            { matchId: 'match1', market: '1X2', selection: 'fora' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 0,
          scoreAway: 2,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Over/Under 2.5 market                                        */
  /* ------------------------------------------------------------ */
  describe('Over/Under 2.5 market', () => {
    it('should settle as WON when over 2.5 is selected and total goals > 2.5', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 1,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-over', [
            { matchId: 'match1', market: 'Gols +/- 2.5', selection: 'Mais de 2.5' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 1,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });

    it('should settle as LOST when over 2.5 is selected but total goals <= 2', async () => {
      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-over-loss', [
            { matchId: 'match1', market: 'OU25', selection: 'over' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 1,
          scoreAway: 0,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.perdedoras).toBe(1);
    });

    it('should settle as WON when under 2.5 is selected and total goals < 2.5', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 1,
          scoreAway: 1,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-under', [
            { matchId: 'match1', market: 'OU25', selection: 'under' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 1,
          scoreAway: 1,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Both Teams To Score (BTTS) market                            */
  /* ------------------------------------------------------------ */
  describe('Both Teams To Score (BTTS) market', () => {
    it('should settle as WON when BTTS yes is selected and both teams scored', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 1,
          scoreAway: 2,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-btts-yes', [
            { matchId: 'match1', market: 'Ambas Marcam', selection: 'Sim' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 1,
          scoreAway: 2,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });

    it('should settle as LOST when BTTS yes is selected but one team did not score', async () => {
      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-btts-lost', [
            { matchId: 'match1', market: 'BTTS', selection: 'yes' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.perdedoras).toBe(1);
    });

    it('should settle as WON when BTTS no is selected and one team did not score', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 3,
          scoreAway: 0,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-btts-no', [
            { matchId: 'match1', market: 'BTTS', selection: 'no' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 3,
          scoreAway: 0,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Multi-selection (accumulator) bets                           */
  /* ------------------------------------------------------------ */
  describe('multi-selection bets', () => {
    it('should leave bet pending when other matches are not yet finished', async () => {
      // match1 finishes but match2 is still in play
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 0,
        }),
      };
      mockMatchSnapshots['match2'] = {
        exists: true,
        data: () => ({
          status: 'IN_PLAY',
          scoreHome: 0,
          scoreAway: 0,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-multi-pending', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
            { matchId: 'match2', market: '1X2', selection: 'home' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      const result = await handler(change, makeContext());
      // Bet was processed (count incremented) but not settled
      expect(result.processadas).toBe(1);
      expect(result.vencedoras).toBe(0);
      expect(result.perdedoras).toBe(0);
    });

    it('should settle multi-selection bet as WON when all matches finished and all won', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 0,
        }),
      };
      mockMatchSnapshots['match2'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 0,
          scoreAway: 3,
        }),
      };

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-multi-won', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
            { matchId: 'match2', market: '1X2', selection: 'away' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.vencedoras).toBe(1);
      expect(result.perdedoras).toBe(0);
    });

    it('should settle as LOST immediately when any selection in a multi-bet loses', async () => {
      // match1 finishes – bet selected 'home' but away won
      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-multi-lost', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
            { matchId: 'match2', market: '1X2', selection: 'home' },
          ]),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 0,
          scoreAway: 1,
        },
      );

      const result = await handler(change, makeContext());
      expect(result.perdedoras).toBe(1);
      expect(result.vencedoras).toBe(0);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Prize payment & ledger                                       */
  /* ------------------------------------------------------------ */
  describe('prize payment', () => {
    it('should credit user balance and create ledger entry on WON bet', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 0,
        }),
      };

      transactionGetSpy.mockImplementation(async () => ({
        exists: true,
        data: () => ({ saldo: 200, nome: 'Player' }),
      }));

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-pay', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
          ], { potentialWin: 50, userId: 'user1' }),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      await handler(change, makeContext());

      // Transaction should have run
      expect(mockRunTransaction).toHaveBeenCalled();
      // User balance updated inside transaction
      expect(transactionUpdateSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ saldo: 250 }),
      );
      // Ledger entry created
      expect(transactionSetSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user1',
          type: 'BET_WIN',
          amount: 50,
          balanceBefore: 200,
          balanceAfter: 250,
          modulo: 'Futebol',
        }),
      );
    });
  });

  /* ------------------------------------------------------------ */
  /*  Promoter commission                                          */
  /* ------------------------------------------------------------ */
  describe('promoter commission', () => {
    it('should pay commission to promoter when winning bet has promotorId', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 0,
        }),
      };

      // First call: user snapshot; Second call: promotor snapshot
      transactionGetSpy
        .mockImplementationOnce(async () => ({
          exists: true,
          data: () => ({ saldo: 100, nome: 'Player' }),
        }))
        .mockImplementationOnce(async () => ({
          exists: true,
          data: () => ({ saldo: 50, nome: 'Promoter', comissao: 15 }),
        }));

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-comm', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
          ], {
            potentialWin: 200,
            userId: 'user1',
            promotorId: 'promotor1',
          }),
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      await handler(change, makeContext());

      // runTransaction should have been called twice (prize + commission)
      expect(mockRunTransaction).toHaveBeenCalledTimes(2);

      // Second transaction: commission
      // promotor saldo 50 + 15% of 200 = 50 + 30 = 80
      expect(transactionUpdateSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ saldo: 80 }),
      );
      expect(transactionSetSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'promotor1',
          type: 'COMMISSION_EARNED',
          amount: 30,
          balanceBefore: 50,
          balanceAfter: 80,
        }),
      );
    });

    it('should NOT pay commission when bet has no promotorId', async () => {
      mockMatchSnapshots['match1'] = {
        exists: true,
        data: () => ({
          status: 'FINISHED',
          scoreHome: 2,
          scoreAway: 0,
        }),
      };

      transactionGetSpy.mockImplementation(async () => ({
        exists: true,
        data: () => ({ saldo: 100, nome: 'Player' }),
      }));

      mockBetsSnapshot = {
        empty: false,
        docs: [
          makeBetDoc('bet-no-prom', [
            { matchId: 'match1', market: '1X2', selection: 'home' },
          ], { potentialWin: 200, userId: 'user1' }),
          // no promotorId
        ],
      };

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 2,
          scoreAway: 0,
        },
      );

      await handler(change, makeContext());

      // Only one transaction (prize), no commission
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------ */
  /*  Error handling                                                */
  /* ------------------------------------------------------------ */
  describe('error handling', () => {
    it('should propagate errors from Firestore operations', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore unavailable'));

      const change = makeChange(
        { status: 'IN_PLAY' },
        {
          status: 'FINISHED',
          homeTeam: 'A',
          awayTeam: 'B',
          scoreHome: 1,
          scoreAway: 0,
        },
      );

      await expect(handler(change, makeContext())).rejects.toThrow('Firestore unavailable');
    });
  });

  /* ------------------------------------------------------------ */
  /*  Unknown market                                                */
  /* ------------------------------------------------------------ */
  it('should treat unknown market selection as lost', async () => {
    mockBetsSnapshot = {
      empty: false,
      docs: [
        makeBetDoc('bet-unknown', [
          { matchId: 'match1', market: 'SomeWeirdMarket', selection: 'foo' },
        ]),
      ],
    };

    const change = makeChange(
      { status: 'IN_PLAY' },
      {
        status: 'FINISHED',
        homeTeam: 'A',
        awayTeam: 'B',
        scoreHome: 1,
        scoreAway: 0,
      },
    );

    const result = await handler(change, makeContext());
    expect(result.perdedoras).toBe(1);
  });
});
