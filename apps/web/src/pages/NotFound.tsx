import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box textAlign="center">
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{ fontSize: '6rem', fontWeight: 300 }}
        >
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          The page you are looking for doesn&apos;t exist or has been moved.
        </Typography>
        <Button variant="contained" onClick={handleGoHome} sx={{ mt: 2 }}>
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
