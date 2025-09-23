import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Cloud as CloudIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../NotificationProvider';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, logout } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Successfully logged out');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showError('Error during logout. You have been signed out locally.');
      // Force navigation to login even if logout fails
      navigate('/login');
    } finally {
      handleMenuClose();
    }
  };

  const isActivePath = (path: string) => location.pathname === path;

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: isMobile ? 1 : 0 }}>
          <CloudIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            EC2 Manager
          </Typography>
        </Box>

        {!isMobile && (
          <Box sx={{ flexGrow: 1, display: 'flex', ml: 4 }}>
            <Button
              color="inherit"
              startIcon={<DashboardIcon />}
              onClick={() => handleNavigation('/dashboard')}
              sx={{
                mr: 2,
                backgroundColor: isActivePath('/dashboard')
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
              }}
            >
              Dashboard
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {state.user && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {!isMobile && (
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {state.user.firstName} {state.user.lastName}
                </Typography>
              )}
              <IconButton
                size="large"
                edge="end"
                aria-label="account menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: theme.palette.secondary.main,
                    fontSize: '0.875rem',
                  }}
                >
                  {getInitials(state.user.firstName, state.user.lastName)}
                </Avatar>
              </IconButton>
            </Box>
          )}

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: { minWidth: 200 },
            }}
          >
            {state.user && (
              <>
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {state.user.firstName} {state.user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {state.user.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Role: {state.user.role}
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
              </>
            )}
            <MenuItem onClick={() => handleNavigation('/profile')}>
              <AccountIcon sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/settings')}>
              <SettingsIcon sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => void handleLogout()}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
