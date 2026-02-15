/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { BasePanelWrapper } from '@/components/panels/BasePanelWrapper';
import type { PanelConfig } from '@/lib/panels/types';

// Mock the panel colors store
const mockStoreState = {
  colors: {},
  isLoading: false,
  _initialized: true,
  fetchColors: jest.fn(),
  setScheme: jest.fn(),
  resetScheme: jest.fn(),
};

jest.mock('@/lib/stores', () => ({
  usePanelColorsStore: jest.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

// Mock PanelColorMenu to verify it's rendered or not
jest.mock('@/components/shell/PanelColorMenu', () => ({
  PanelColorMenu: ({ children, panelId }: { children: React.ReactNode; panelId: string }) => (
    <div data-testid="panel-color-menu" data-panel-id={panelId}>
      {children}
    </div>
  ),
}));

// Import the mocked store to control its return value
import { usePanelColorsStore } from '@/lib/stores';

const mockedUsePanelColorsStore = usePanelColorsStore as jest.MockedFunction<typeof usePanelColorsStore>;

describe('BasePanelWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: panel colors initialized (dashboard context)
    mockStoreState._initialized = true;
    mockedUsePanelColorsStore.mockImplementation((selector?: (state: typeof mockStoreState) => unknown) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    });
  });

  describe('renders children correctly', () => {
    it('should render children content', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Test Content</span>
        </BasePanelWrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>First Child</span>
          <span>Second Child</span>
        </BasePanelWrapper>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
    });
  });

  describe('data-panel-id attribute', () => {
    it('should add data-panel-id attribute with config.id', () => {
      const config: PanelConfig = {
        id: 'my-custom-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveAttribute('data-panel-id', 'my-custom-panel');
    });
  });

  describe('PanelColorMenu wrapping', () => {
    it('should wrap with PanelColorMenu when context is "dashboard" and colors available', () => {
      const config: PanelConfig = {
        id: 'dashboard-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Dashboard Content</span>
        </BasePanelWrapper>
      );

      expect(screen.getByTestId('panel-color-menu')).toBeInTheDocument();
      expect(screen.getByTestId('panel-color-menu')).toHaveAttribute('data-panel-id', 'dashboard-panel');
    });

    it('should NOT wrap with PanelColorMenu when context is "presenter"', () => {
      const config: PanelConfig = {
        id: 'presenter-panel',
        context: 'presenter',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Presenter Content</span>
        </BasePanelWrapper>
      );

      expect(screen.queryByTestId('panel-color-menu')).not.toBeInTheDocument();
    });

    it('should NOT wrap with PanelColorMenu when context is "settings"', () => {
      const config: PanelConfig = {
        id: 'settings-panel',
        context: 'settings',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Settings Content</span>
        </BasePanelWrapper>
      );

      expect(screen.queryByTestId('panel-color-menu')).not.toBeInTheDocument();
    });

    it('should NOT wrap with PanelColorMenu when context is "overlay"', () => {
      const config: PanelConfig = {
        id: 'overlay-panel',
        context: 'overlay',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Overlay Content</span>
        </BasePanelWrapper>
      );

      expect(screen.queryByTestId('panel-color-menu')).not.toBeInTheDocument();
    });

    it('should NOT wrap with PanelColorMenu when colorMenuEnabled is false', () => {
      const config: PanelConfig = {
        id: 'dashboard-panel',
        context: 'dashboard',
        colorMenuEnabled: false,
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Dashboard Content</span>
        </BasePanelWrapper>
      );

      expect(screen.queryByTestId('panel-color-menu')).not.toBeInTheDocument();
    });

    it('should NOT wrap with PanelColorMenu when store is not initialized', () => {
      mockStoreState._initialized = false;
      mockedUsePanelColorsStore.mockImplementation((selector?: (state: typeof mockStoreState) => unknown) => {
        if (selector) return selector(mockStoreState);
        return mockStoreState;
      });

      const config: PanelConfig = {
        id: 'dashboard-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Dashboard Content</span>
        </BasePanelWrapper>
      );

      expect(screen.queryByTestId('panel-color-menu')).not.toBeInTheDocument();
    });

    it('should wrap with PanelColorMenu when colorMenuEnabled is explicitly true', () => {
      const config: PanelConfig = {
        id: 'dashboard-panel',
        context: 'dashboard',
        colorMenuEnabled: true,
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Dashboard Content</span>
        </BasePanelWrapper>
      );

      expect(screen.getByTestId('panel-color-menu')).toBeInTheDocument();
    });
  });

  describe('padding behavior', () => {
    it('should use default padding of "1rem" for dashboard context', () => {
      const config: PanelConfig = {
        id: 'dashboard-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '1rem' });
    });

    it('should use default padding of "0" for presenter context', () => {
      const config: PanelConfig = {
        id: 'presenter-panel',
        context: 'presenter',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '0' });
    });

    it('should use default padding of "0" for settings context', () => {
      const config: PanelConfig = {
        id: 'settings-panel',
        context: 'settings',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '0' });
    });

    it('should use default padding of "0" for overlay context', () => {
      const config: PanelConfig = {
        id: 'overlay-panel',
        context: 'overlay',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '0' });
    });

    it('should respect custom padding prop (string)', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config} padding="2rem">
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '2rem' });
    });

    it('should respect custom padding prop (number)', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config} padding={16}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '16px' });
    });

    it('should prefer config.padding over context default', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
        padding: '0.5rem',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '0.5rem' });
    });

    it('should prefer padding prop over config.padding', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
        padding: '0.5rem',
      };

      render(
        <BasePanelWrapper config={config} padding="3rem">
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ padding: '3rem' });
    });
  });

  describe('scrollable behavior', () => {
    it('should set overflow to "auto" by default', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ overflow: 'auto' });
    });

    it('should set overflow to "auto" when scrollable is true', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
        scrollable: true,
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ overflow: 'auto' });
    });

    it('should set overflow to "hidden" when scrollable is false', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'dashboard',
        scrollable: false,
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ overflow: 'hidden' });
    });
  });

  describe('additional props', () => {
    it('should apply custom className', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'presenter',
      };

      render(
        <BasePanelWrapper config={config} className="custom-class">
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveClass('custom-class');
    });

    it('should apply custom style', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'presenter',
      };

      render(
        <BasePanelWrapper config={config} style={{ border: '1px solid black' }}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ border: '1px solid black' });
    });

    it('should always set height to 100%', () => {
      const config: PanelConfig = {
        id: 'test-panel',
        context: 'presenter',
      };

      render(
        <BasePanelWrapper config={config}>
          <span>Content</span>
        </BasePanelWrapper>
      );

      const panelContainer = screen.getByText('Content').parentElement;
      expect(panelContainer).toHaveStyle({ height: '100%' });
    });
  });
});
