import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { formatAbsoluteTime } from '../utils/timeUtils';

const Profile: React.FC = () => {
  const { state } = useAuth();
  const { user } = state;
  const theme = useTheme();

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="h5">Loading profile...</Typography>
      </Container>
    );
  }

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Unknown';
    try {
      return formatAbsoluteTime(dateString);
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your account information and settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Overview Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '2rem',
                    mb: 2,
                  }}
                >
                  {getInitials(user.firstName, user.lastName)}
                </Avatar>
                <Typography variant="h6" align="center" gutterBottom>
                  {user.firstName} {user.lastName}
                </Typography>
                <Chip
                  label={user.role}
                  color={user.role === 'admin' ? 'primary' : 'default'}
                  variant="outlined"
                  icon={<SecurityIcon />}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Details Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Details
              </Typography>

              <Stack spacing={3} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {user.firstName} {user.lastName}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmailIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BadgeIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      User ID
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace" fontSize="0.875rem">
                      {user.userId}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SecurityIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Access Role
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                      <Typography variant="caption" color="textSecondary">
                        {user.role === 'admin'
                          ? 'Can manage all EC2 instances and system settings'
                          : 'Can view EC2 instances but cannot perform administrative actions'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ScheduleIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Account Created
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(user.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {user.lastLogin && (
                  <>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ScheduleIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Last Login
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {formatDate(user.lastLogin)}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Role Permissions Info */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Role Permissions
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Your current role determines what actions you can perform in the EC2 Manager:
        </Typography>

        {user.role === 'admin' ? (
          <Box sx={{ color: 'primary.main' }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Administrator Privileges:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li>View all EC2 instances</li>
              <li>Start, stop, and reboot instances</li>
              <li>Access system settings and configuration</li>
              <li>Manage user accounts and permissions</li>
              <li>View detailed instance metrics and logs</li>
            </Typography>
          </Box>
        ) : (
          <Box sx={{ color: 'text.secondary' }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Read-Only Access:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li>View EC2 instances and their status</li>
              <li>Browse instance details and configurations</li>
              <li>Access monitoring and performance data</li>
              <li>Generate reports and export data</li>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              Contact your administrator to request additional permissions.
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Profile;
