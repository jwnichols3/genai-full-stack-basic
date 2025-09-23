import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { InstanceStatusBadge } from '../../../../src/components/instances/InstanceStatusBadge';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('InstanceStatusBadge', () => {
  it('renders with running state', () => {
    renderWithTheme(<InstanceStatusBadge state="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders with stopped state', () => {
    renderWithTheme(<InstanceStatusBadge state="stopped" />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('renders with pending state', () => {
    renderWithTheme(<InstanceStatusBadge state="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders with terminated state', () => {
    renderWithTheme(<InstanceStatusBadge state="terminated" />);
    expect(screen.getByText('Terminated')).toBeInTheDocument();
  });

  it('renders with stopping state', () => {
    renderWithTheme(<InstanceStatusBadge state="stopping" />);
    expect(screen.getByText('Stopping')).toBeInTheDocument();
  });

  it('renders with shutting-down state', () => {
    renderWithTheme(<InstanceStatusBadge state="shutting-down" />);
    expect(screen.getByText('Shutting Down')).toBeInTheDocument();
  });

  it('renders with correct colors for running state', () => {
    renderWithTheme(<InstanceStatusBadge state="running" />);
    const badge = screen.getByText('Running').closest('.MuiChip-root');
    expect(badge).toHaveStyle({ color: '#4caf50' });
  });

  it('renders with correct colors for stopped state', () => {
    renderWithTheme(<InstanceStatusBadge state="stopped" />);
    const badge = screen.getByText('Stopped').closest('.MuiChip-root');
    expect(badge).toHaveStyle({ color: '#f44336' });
  });

  it('renders with medium size when specified', () => {
    renderWithTheme(<InstanceStatusBadge state="running" size="medium" />);
    const badge = screen.getByText('Running').closest('.MuiChip-root');
    expect(badge).toHaveClass('MuiChip-sizeMedium');
  });

  it('renders with small size by default', () => {
    renderWithTheme(<InstanceStatusBadge state="running" />);
    const badge = screen.getByText('Running').closest('.MuiChip-root');
    expect(badge).toHaveClass('MuiChip-sizeSmall');
  });
});
