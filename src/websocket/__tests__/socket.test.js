/**
 * src/websocket/__tests__/socket.test.js
 * Unit tests for WebSocket logic
 */

const { initSocket } = require('../socket');
const { getIO } = require('../io');
const orderEvents = require('../events/order.events');
const notificationEvents = require('../events/notification.events');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production-min-64-chars';

// Mock external dependencies
jest.mock('../../config/database', () => ({
    prisma: {
        user: {
            findUnique: jest.fn()
        }
    }
}));

const { prisma } = require('../../config/database');

describe('WebSocket Logic', () => {
    let mockIo;
    let mockSocket;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Socket.io Server
        mockIo = {
            use: jest.fn(),
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };

        // Mock Socket.io Client Socket
        mockSocket = {
            id: 'test-socket-id',
            user: { id: 'user-1', role: 'CUSTOMER' },
            join: jest.fn(),
            leave: jest.fn(),
            on: jest.fn(),
            emit: jest.fn(),
            handshake: {
                auth: { token: 'mock-token' }
            }
        };

        // Initialize socket with mock
        initSocket(mockIo);
    });

    test('initSocket should register middleware and connection listener', () => {
        expect(mockIo.use).toHaveBeenCalled();
        expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('JWT Middleware should verify user and attach to socket', async () => {
        const middleware = mockIo.use.mock.calls[0][0];
        const next = jest.fn();

        // Mock JWT
        const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-64-chars');
        mockSocket.handshake.auth.token = token;

        // Mock Prisma
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: true, role: 'CUSTOMER' });

        await middleware(mockSocket, next);

        expect(next).toHaveBeenCalledWith();
        expect(mockSocket.user).toBeDefined();
        expect(mockSocket.user.id).toBe('user-1');
    });

    test('Connection should join user rooms', () => {
        const onConnection = mockIo.on.mock.calls[0][1];
        onConnection(mockSocket);

        expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
        expect(mockSocket.join).toHaveBeenCalledWith('role:customer');
    });

    test('Order Emitters should send events', () => {
        const dummyOrder = { id: 'order-123', customerId: 'user-1', status: 'PENDING' };

        orderEvents.emitOrderNew(dummyOrder);

        expect(mockIo.to).toHaveBeenCalled();
        expect(mockIo.emit).toHaveBeenCalledWith('order:new', expect.any(Object));
    });

    test('Notification Emitters should send to user room', () => {
        const dummyNotif = { id: 'n1', title: 'Hi', body: 'Test' };

        notificationEvents.emitNotificationNew('user-1', dummyNotif);

        expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
        expect(mockIo.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({
            title: 'Hi'
        }));
    });
});
