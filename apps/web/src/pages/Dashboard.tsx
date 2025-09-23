import React, { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams } from '@mui/x-data-grid';
import { EC2Instance } from '@ec2-manager/shared';
import { useInstances } from '../hooks/useInstances';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { InstanceStatusBadge } from '../components/instances/InstanceStatusBadge';
import { getInstanceName, formatInstanceIp, formatLaunchTime, getInstanceAge } from '../utils/instanceUtils';
import { useResponsive } from '../utils/responsive';

const Dashboard: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const {
    instances,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useInstances(30000); // 30-second auto-refresh

  const [refreshing, setRefreshing] = useState(false);

  // Restore scroll position when returning from instance detail
  useEffect(() => {
    const state = location.state as { scrollPosition?: number } | undefined;
    if (state?.scrollPosition) {
      window.scrollTo(0, state.scrollPosition);
      // Clear the state to prevent restoration on subsequent visits
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation to login even if logout fails
      navigate('/login');
    }
  };

  const handleInstanceRowClick = (instanceId: string) => {
    // Store current scroll position for restoration when returning
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    navigate(`/instances/${instanceId}`, {
      state: { scrollPosition }
    });
  };

  const columns: GridColDef[] = useMemo(() => {
    const baseColumns: GridColDef[] = [
      {
        field: 'instanceId',
        headerName: 'Instance ID',
        width: 200,
        hideable: false,
      },
      {
        field: 'name',
        headerName: 'Name',
        width: 200,
        valueGetter: (_, row: EC2Instance) => getInstanceName(row),
        hideable: false,
      },
      {
        field: 'state',
        headerName: 'Status',
        width: 140,
        renderCell: (params: GridRenderCellParams) => (
          <InstanceStatusBadge state={params.value as 'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated'} />
        ),
        hideable: false,
      },
      {
        field: 'instanceType',
        headerName: 'Type',
        width: 120,
      },
      {
        field: 'publicIpAddress',
        headerName: 'Public IP',
        width: 140,
        valueGetter: (value) => formatInstanceIp(value),
      },
      {
        field: 'privateIpAddress',
        headerName: 'Private IP',
        width: 140,
        valueGetter: (value) => formatInstanceIp(value),
      },
      {
        field: 'launchTime',
        headerName: 'Launch Time',
        width: 180,
        valueGetter: (value) => formatLaunchTime(value),
      },
      {
        field: 'age',
        headerName: 'Age',
        width: 100,
        valueGetter: (_, row: EC2Instance) => getInstanceAge(row.launchTime),
      },
    ];

    // Hide columns on smaller screens
    if (isMobile) {
      return baseColumns.filter(col =>
        ['instanceId', 'name', 'state'].includes(col.field)
      );
    } else if (isTablet) {
      return baseColumns.filter(col =>
        !['age', 'launchTime'].includes(col.field)
      );
    }

    return baseColumns;
  }, [isMobile, isTablet]);

  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" color="textSecondary" gutterBottom>
        No instances found
      </Typography>
      <Typography variant="body2" color="textSecondary">
        You don&apos;t have any EC2 instances in your account, or they may be in a different region.
      </Typography>
    </Box>
  );

  const renderError = () => (
    <Alert
      severity="error"
      action={
        <IconButton
          color="inherit"
          size="small"
          onClick={() => { void handleManualRefresh(); }}
          disabled={refreshing}
        >
          <RefreshIcon />
        </IconButton>
      }
    >
      {error}
    </Alert>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h1"
          >
            EC2 Instances
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {lastUpdated && (
              <Tooltip title={`Last updated: ${lastUpdated.toLocaleString()}`}>
                <Chip
                  icon={<ScheduleIcon />}
                  label={`Last updated ${lastUpdated.toLocaleTimeString()}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}

            <Tooltip title="Refresh instances">
              <IconButton
                onClick={() => { void handleManualRefresh(); }}
                disabled={refreshing || loading}
                color="primary"
                aria-label="refresh"
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              color="secondary"
              startIcon={<LogoutIcon />}
              onClick={() => { void handleLogout(); }}
              size="small"
            >
              Logout
            </Button>
          </Stack>
        </Stack>

        {error && renderError()}
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        {loading && instances.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : instances.length === 0 && !error ? (
          renderEmptyState()
        ) : (
          <DataGrid
            rows={instances}
            columns={columns}
            getRowId={(row: EC2Instance) => row.instanceId}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                },
              },
              sorting: {
                sortModel: [{ field: 'name', sort: 'asc' }],
              },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection={false}
            disableRowSelectionOnClick
            loading={loading}
            onRowClick={(params) => handleInstanceRowClick(params.row.instanceId)}
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': {
                borderColor: 'rgba(224, 224, 224, 1)',
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          />
        )}
      </Paper>

      {instances.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Showing {instances.length} instance{instances.length !== 1 ? 's' : ''}
            {lastUpdated && ` • Auto-refresh every 30 seconds`}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
