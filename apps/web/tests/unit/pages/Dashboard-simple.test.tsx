import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock all the dependencies to avoid import.meta issues
jest.mock('../../../src/hooks/useInstances', () => ({
  useInstances: () => ({
    instances: [
      {
        instanceId: 'i-1234567890',
        instanceType: 't3.micro',
        state: 'running',
        launchTime: '2024-01-01T00:00:00Z',
        publicIpAddress: '1.2.3.4',
        privateIpAddress: '10.0.1.1',
        tags: { Name: 'Test Instance' },
      },
    ],
    loading: false,
    error: null,
    lastUpdated: new Date('2024-01-01T12:00:00Z'),
    refresh: jest.fn(),
    setFilters: jest.fn(),
  }),
}));

jest.mock('../../../src/utils/responsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
  }),
}));

jest.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows }: any) => (
    <div data-testid="data-grid">
      {rows.map((row: any) => (
        <div key={row.instanceId} data-testid={`instance-${row.instanceId}`}>
          {row.tags?.Name || row.instanceId}
        </div>
      ))}
    </div>
  ),
  GridToolbar: () => <div>Toolbar</div>,
  GridColDef: {},
  GridRenderCellParams: {},
}));

jest.mock('../../../src/components/instances/InstanceStatusBadge', () => ({
  InstanceStatusBadge: ({ state }: any) => <span>{state}</span>,
}));

import Dashboard from '../../../src/pages/Dashboard';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('Dashboard - Basic Functionality', () => {
  it('renders dashboard title', () => {
    renderWithTheme(<Dashboard />);
    expect(screen.getByText('EC2 Dashboard')).toBeInTheDocument();
  });

  it('displays DataGrid component', () => {
    renderWithTheme(<Dashboard />);
    expect(screen.getByTestId('data-grid')).toBeInTheDocument();
  });

  it('shows instance data', () => {
    renderWithTheme(<Dashboard />);
    expect(screen.getByTestId('instance-i-1234567890')).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    renderWithTheme(<Dashboard />);
    expect(screen.getByLabelText('Refresh instances')).toBeInTheDocument();
  });

  it('shows last updated timestamp', () => {
    renderWithTheme(<Dashboard />);
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });
});
