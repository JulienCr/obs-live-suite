import '@testing-library/jest-dom'

// Mock environment variables
process.env.OBS_WEBSOCKET_URL = 'ws://localhost:4455'
process.env.OBS_WEBSOCKET_PASSWORD = 'test_password'
process.env.APP_PORT = '3000'
process.env.WEBSOCKET_PORT = '3001'

