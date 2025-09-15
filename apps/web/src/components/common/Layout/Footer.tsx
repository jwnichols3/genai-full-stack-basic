import React from 'react';
import { Box, Container, Typography, Link, Divider, useTheme } from '@mui/material';

const Footer: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.grey[100],
        borderTop: `1px solid ${theme.palette.grey[300]}`,
        mt: 'auto',
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: 2,
          }}
        >
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="body2" color="textSecondary">
              EC2 Instance Manager
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Manage your AWS EC2 instances with ease
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 3 },
              alignItems: 'center',
            }}
          >
            <Link href="/docs" color="textSecondary" underline="hover" variant="body2">
              Documentation
            </Link>
            <Link href="/support" color="textSecondary" underline="hover" variant="body2">
              Support
            </Link>
            <Link
              href="https://aws.amazon.com/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              color="textSecondary"
              underline="hover"
              variant="body2"
            >
              Privacy Policy
            </Link>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="textSecondary">
            © {currentYear} EC2 Instance Manager. All rights reserved.
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Powered by AWS
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
