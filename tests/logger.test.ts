import Logger from '../src/logger';

// Mock console.log and console.error
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LOG_LEVEL = 'info'; // Set default log level for tests
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('should log info messages when LOG_LEVEL is info', () => {
    const logger = new Logger('TestMicroservice');
    logger.info('Test info message');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.level).toBe('INFO');
    expect(loggedMessage.message).toBe('Test info message');
    expect(loggedMessage.microservice).toBe('TestMicroservice');
  });

  test('should not log debug messages when LOG_LEVEL is info', () => {
    const logger = new Logger('TestMicroservice');
    logger.debug('Test debug message');
    expect(mockConsoleLog).not.toHaveBeenCalled();
  });

  test('should log error messages to console.error', () => {
    const logger = new Logger('TestMicroservice');
    logger.error('Test error message');
    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    const loggedMessage = JSON.parse(mockConsoleError.mock.calls[0][0]);
    expect(loggedMessage.level).toBe('ERROR');
    expect(loggedMessage.message).toBe('Test error message');
    expect(loggedMessage.microservice).toBe('TestMicroservice');
  });

  test('should include caller information in log messages', () => {
    const logger = new Logger('TestMicroservice');
    function testFunction() {
      logger.info('Test message with caller info');
    }
    testFunction();
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.caller).toBe('testFunction');
    expect(loggedMessage.microservice).toBe('TestMicroservice');
  });

  test('should log all levels when LOG_LEVEL is debug', () => {
    process.env.LOG_LEVEL = 'debug';
    const logger = new Logger('TestService');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    expect(mockConsoleLog).toHaveBeenCalledTimes(3);
    expect(mockConsoleError).toHaveBeenCalledTimes(1);
  });

  test('should only log errors when LOG_LEVEL is error', () => {
    process.env.LOG_LEVEL = 'error';
    const logger = new Logger('TestService');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    expect(mockConsoleLog).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledTimes(1);
  });

  test('should handle objects in log messages', () => {
    const logger = new Logger('TestMicroservice');
    logger.info({ key: 'value', nested: { prop: true } });
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.key).toBe('value');
    expect(loggedMessage.nested.prop).toBe(true);
    expect(loggedMessage.microservice).toBe('TestMicroservice');
  });

  test('should handle complex errors', () => {
    const logger = new Logger('TestService');
    const error = new Error('Test complex error');
    logger.logComplexError(error);
    const loggedMessage = JSON.parse(mockConsoleError.mock.calls[0][0]);
    expect(loggedMessage.complexError).toContain('Error: Test complex error');
    expect(loggedMessage.complexError).toContain('at ');
  });

  test('should handle undefined LOG_LEVEL', () => {
    delete process.env.LOG_LEVEL;
    const logger = new Logger('TestMicroservice');
    logger.info('Test info message');
    logger.debug('Test debug message');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
  });

  test('should handle invalid LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'invalid_level';
    const logger = new Logger('TestMicroservice');
    logger.info('Test info message');
    logger.debug('Test debug message');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
  });

  test('should handle empty string messages', () => {
    const logger = new Logger('TestMicroservice');
    logger.info('');
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"message":""'));
  });

  test('should handle messages with special characters', () => {
    const logger = new Logger('TestMicroservice');
    logger.info('Test "quotes" and \n newlines');
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.message).toBe('Test "quotes" and \n newlines');
  });

  test('should handle very long messages', () => {
    const logger = new Logger('TestMicroservice');
    const longMessage = 'a'.repeat(10000);
    logger.info(longMessage);
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.message.length).toBe(10000);
  });

  test('should handle nested objects in log messages', () => {
    const logger = new Logger('TestMicroservice');
    logger.info({
      level1: {
        level2: {
          level3: 'nested value'
        }
      }
    });
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.level1.level2.level3).toBe('nested value');
  });

  test('should handle arrays in log messages', () => {
    const logger = new Logger('TestMicroservice');
    logger.info({ array: [1, 2, 3, { nested: 'value' }] });
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.array).toEqual([1, 2, 3, { nested: 'value' }]);
  });

  test('should handle circular references in log messages', () => {
    const logger = new Logger('TestMicroservice');
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;
    logger.info(circularObj);
    expect(mockConsoleLog).toHaveBeenCalled();
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.a).toBe(1);
    expect(loggedMessage.self).toBe('[Circular]');
  });

  test('should handle Error objects in log messages', () => {
    const logger = new Logger('TestMicroservice');
    const error = new Error('Test error');
    logger.error({ error });
    const loggedMessage = JSON.parse(mockConsoleError.mock.calls[0][0]);
    expect(loggedMessage.error).toEqual({
      name: 'Error',
      message: 'Test error',
      stack: expect.any(String)
    });
  });

  test('should handle changing log levels at runtime', () => {
    process.env.LOG_LEVEL = 'error';
    const logger = new Logger('TestMicroservice');
    logger.info('This should not be logged');
    expect(mockConsoleLog).not.toHaveBeenCalled();

    process.env.LOG_LEVEL = 'debug';
    const newLogger = new Logger('TestMicroservice');
    newLogger.debug('This should be logged');
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('"level":"DEBUG"'));
  });

  test('should handle logComplexError with custom error object', () => {
    const logger = new Logger('TestMicroservice');
    const customError = {
      name: 'CustomError',
      message: 'Custom error message',
      code: 'ERR_CUSTOM',
      details: { additional: 'info' }
    };
    logger.logComplexError(customError);
    expect(mockConsoleError).toHaveBeenCalledTimes(1);
    const loggedMessage = JSON.parse(mockConsoleError.mock.calls[0][0]);
    expect(loggedMessage.complexError).toContain('CustomError');
    expect(loggedMessage.complexError).toContain('Custom error message');
    expect(loggedMessage.complexError).toContain('ERR_CUSTOM');
    expect(loggedMessage.complexError).toContain('additional');
  });

  test('should handle logging of non-enumerable properties', () => {
    const logger = new Logger('TestMicroservice');
    const objWithNonEnumerable = { visible: 'enum' };
    Object.defineProperty(objWithNonEnumerable, 'hidden', {
      value: 'non-enum',
      enumerable: false
    });
    logger.info(objWithNonEnumerable);
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.visible).toBe('enum');
    expect(loggedMessage.hidden).toBeUndefined();
  });

  test('should handle logging of Symbol properties', () => {
    const logger = new Logger('TestMicroservice');
    const sym = Symbol('testSymbol');
    const objWithSymbol = {
      [sym]: 'symbol value',
      regular: 'regular value'
    };
    logger.info(objWithSymbol);
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.regular).toBe('regular value');
    expect(loggedMessage[sym.toString()]).toBeUndefined();
  });

  test('should handle logging of functions', () => {
    const logger = new Logger('TestMicroservice');
    const objWithFunction = {
      func: () => 'test function',
      value: 'test value'
    };
    logger.info(objWithFunction);
    const loggedMessage = JSON.parse(mockConsoleLog.mock.calls[0][0]);
    expect(loggedMessage.value).toBe('test value');
    expect(loggedMessage.func).toContain('() => \'test function\'');
  });
});
