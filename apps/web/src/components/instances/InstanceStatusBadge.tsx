import React from 'react';
import { Chip } from '@mui/material';
import {
  PlayArrow as RunningIcon,
  Stop as StoppedIcon,
  HourglassEmpty as PendingIcon,
  Block as TerminatedIcon,
  PowerOff as StoppingIcon,
  PowerSettingsNew as ShuttingDownIcon,
} from '@mui/icons-material';

interface InstanceStatusBadgeProps {
  state: 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated';
  size?: 'small' | 'medium';
}

const getStateConfig = (state: string) => {
  switch (state) {
    case 'running':
      return {
        color: '#4caf50',
        backgroundColor: '#e8f5e8',
        icon: <RunningIcon />,
        label: 'Running',
      };
    case 'pending':
      return {
        color: '#ff9800',
        backgroundColor: '#fff3e0',
        icon: <PendingIcon />,
        label: 'Pending',
      };
    case 'stopped':
      return {
        color: '#f44336',
        backgroundColor: '#ffebee',
        icon: <StoppedIcon />,
        label: 'Stopped',
      };
    case 'terminated':
      return {
        color: '#9e9e9e',
        backgroundColor: '#f5f5f5',
        icon: <TerminatedIcon />,
        label: 'Terminated',
      };
    case 'stopping':
      return {
        color: '#ff5722',
        backgroundColor: '#fbe9e7',
        icon: <StoppingIcon />,
        label: 'Stopping',
      };
    case 'shutting-down':
      return {
        color: '#424242',
        backgroundColor: '#e0e0e0',
        icon: <ShuttingDownIcon />,
        label: 'Shutting Down',
      };
    default:
      return {
        color: '#757575',
        backgroundColor: '#f0f0f0',
        icon: null,
        label: state,
      };
  }
};

export const InstanceStatusBadge: React.FC<InstanceStatusBadgeProps> = React.memo(
  ({ state, size = 'small' }) => {
    const config = getStateConfig(state);

    return (
      <Chip
        icon={config.icon ?? undefined}
        label={config.label}
        size={size}
        sx={{
          color: config.color,
          backgroundColor: config.backgroundColor,
          fontWeight: 500,
          '& .MuiChip-icon': {
            color: config.color,
          },
        }}
      />
    );
  }
);

InstanceStatusBadge.displayName = 'InstanceStatusBadge';
