import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Skeleton,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  LocationOn as LocationIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  RestartAlt as RebootIcon,
} from '@mui/icons-material';
import { useInstanceDetail } from '../hooks/useInstanceDetail';
import { InstanceStatusBadge } from '../components/instances/InstanceStatusBadge';
import { InstanceTags } from '../components/instances/InstanceTags';
import { InstanceNetwork } from '../components/instances/InstanceNetwork';
import { getInstanceName } from '../utils/instanceUtils';
import { formatRelativeTime, formatAbsoluteTime } from '../utils/timeUtils';
import { useResponsive } from '../utils/responsive';
import { RoleGuard } from '../components/common/RoleGuard';
import { PermissionTooltip } from '../components/common/PermissionTooltip';

const InstanceDetail: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();

  const { instance, loading, error, refresh } = useInstanceDetail(instanceId ?? '');

  useEffect(() => {
    if (!instanceId) {
      navigate('/dashboard');
    }
  }, [instanceId, navigate]);

  const handleBack = () => {
    // Restore dashboard scroll position if available in location state
    const dashboardState = location.state as { scrollPosition?: number } | undefined;
    navigate('/dashboard', {
      state: dashboardState ? { scrollPosition: dashboardState.scrollPosition } : undefined,
    });
  };

  const renderLoadingSkeleton = () => (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="text" width={400} height={48} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={150} height={24} />
            <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={150} height={24} />
            <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={150} height={24} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );

  const renderError = () => (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      </Box>

      <Alert
        severity="error"
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        }
      >
        {error}
      </Alert>
    </Container>
  );

  if (loading && !instance) {
    return renderLoadingSkeleton();
  }

  if (error && !instance) {
    return renderError();
  }

  if (!instance) {
    return null;
  }

  const instanceName = getInstanceName(instance);
  const relativeTime = formatRelativeTime(instance.launchTime);
  const absoluteTime = formatAbsoluteTime(instance.launchTime);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header with breadcrumbs and instance info */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={handleBack}
            sx={{
              textDecoration: 'none',
              color: 'primary.main',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
              font: 'inherit',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Dashboard
          </Link>
          <Typography variant="body1" color="textSecondary">
            Instance Details
          </Typography>
        </Breadcrumbs>

        <Stack
          direction={isMobile ? 'column' : 'row'}
          justifyContent="space-between"
          alignItems={isMobile ? 'flex-start' : 'center'}
          spacing={2}
        >
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" sx={{ mb: 1 }}>
              {instanceName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="textSecondary" fontFamily="monospace">
                {instance.instanceId}
              </Typography>
              <InstanceStatusBadge state={instance.state} />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh instance details">
              <IconButton onClick={() => void refresh()} disabled={loading} color="primary">
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>

            {/* Admin Actions */}
            <RoleGuard requiredRole="admin">
              <Stack direction="row" spacing={1}>
                {instance.state === 'stopped' && (
                  <PermissionTooltip requiredRole="admin" message="Start this EC2 instance">
                    <Button
                      variant="outlined"
                      startIcon={<StartIcon />}
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      onClick={() => {
                        // TODO: Implement start instance functionality
                        // console.log('Start instance:', instance.instanceId);
                      }}
                    >
                      Start
                    </Button>
                  </PermissionTooltip>
                )}

                {instance.state === 'running' && (
                  <>
                    <PermissionTooltip requiredRole="admin" message="Reboot this EC2 instance">
                      <Button
                        variant="outlined"
                        startIcon={<RebootIcon />}
                        color="warning"
                        size={isMobile ? 'small' : 'medium'}
                        onClick={() => {
                          // TODO: Implement reboot instance functionality
                          // console.log('Reboot instance:', instance.instanceId);
                        }}
                      >
                        Reboot
                      </Button>
                    </PermissionTooltip>

                    <PermissionTooltip requiredRole="admin" message="Stop this EC2 instance">
                      <Button
                        variant="outlined"
                        startIcon={<StopIcon />}
                        color="error"
                        size={isMobile ? 'small' : 'medium'}
                        onClick={() => {
                          // TODO: Implement stop instance functionality
                          // console.log('Stop instance:', instance.instanceId);
                        }}
                      >
                        Stop
                      </Button>
                    </PermissionTooltip>
                  </>
                )}
              </Stack>
            </RoleGuard>

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              size={isMobile ? 'small' : 'medium'}
            >
              Back
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Instance Details Grid */}
      <Grid container spacing={3}>
        {/* Overview Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                Overview
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ComputerIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Instance Type
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {instance.instanceType}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Availability Zone
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {instance.availabilityZone}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Launch Time
                    </Typography>
                    <Tooltip title={absoluteTime}>
                      <Typography variant="body2" fontWeight="medium">
                        {relativeTime}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>

                {instance.monitoring && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Monitoring
                      </Typography>
                      <Chip
                        label={instance.monitoring?.state}
                        size="small"
                        color={instance.monitoring?.state === 'enabled' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Information */}
        <Grid item xs={12} md={6}>
          <InstanceNetwork instance={instance} />
        </Grid>

        {/* Tags */}
        <Grid item xs={12}>
          <InstanceTags tags={instance.tags} />
        </Grid>
      </Grid>

      {/* Error display if there was an error during refresh but we still have data */}
      {error && instance && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Failed to refresh instance details: {error}
        </Alert>
      )}
    </Container>
  );
};

export default InstanceDetail;
