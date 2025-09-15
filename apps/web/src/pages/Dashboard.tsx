import React from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Paper } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Computer as ComputerIcon,
  CloudQueue as CloudIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useResponsive, getResponsiveContainerStyles } from '../utils/responsive';

const Dashboard: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();

  const statsCards = [
    {
      title: 'Running Instances',
      value: '12',
      icon: <ComputerIcon />,
      color: '#1B660F',
    },
    {
      title: 'Stopped Instances',
      value: '3',
      icon: <CloudIcon />,
      color: '#FF9900',
    },
    {
      title: 'Total Instances',
      value: '15',
      icon: <DashboardIcon />,
      color: '#232F3E',
    },
    {
      title: 'Monthly Cost',
      value: '$247.85',
      icon: <AssessmentIcon />,
      color: '#D13212',
    },
  ];

  return (
    <Container maxWidth="lg" sx={getResponsiveContainerStyles()}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        component="h1"
        gutterBottom
        sx={{ mb: { xs: 2, md: 4 } }}
      >
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease-in-out',
                },
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: { xs: 2, md: 3 },
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '1.1rem', md: '1.25rem' },
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                    }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    color: stat.color,
                    opacity: 0.7,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  {stat.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Area */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, md: 3 },
              height: { xs: 'auto', md: 400 },
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Instance Overview
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Monitor and manage your AWS EC2 instances from this dashboard.
              {!isMobile &&
                !isTablet &&
                ' Use the navigation sidebar to access different features and manage your cloud infrastructure efficiently.'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, md: 3 },
              height: { xs: 'auto', md: 400 },
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Launch new instances, manage existing ones, and configure your AWS environment.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
