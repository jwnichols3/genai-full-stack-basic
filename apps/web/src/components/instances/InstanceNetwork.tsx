import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Dns as DnsIcon,
  Security as SecurityIcon,
  Router as RouterIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { EC2InstanceDetail } from '../../services/ec2';

interface InstanceNetworkProps {
  instance: EC2InstanceDetail;
}

export const InstanceNetwork: React.FC<InstanceNetworkProps> = ({ instance }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const renderCopyableField = (
    label: string,
    value: string | null | undefined,
    icon?: React.ReactNode
  ) => {
    if (!value) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Box>
            <Typography variant="body2" color="textSecondary">
              {label}
            </Typography>
            <Typography variant="body2" color="textSecondary" fontStyle="italic">
              Not available
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
              {value}
            </Typography>
            <Tooltip title={`Copy ${label.toLowerCase()}`}>
              <IconButton
                size="small"
                onClick={() => void handleCopyToClipboard(value, label)}
                sx={{ p: 0.5 }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderSecurityGroups = () => {
    if (!instance.securityGroups || instance.securityGroups.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary" fontStyle="italic">
          No security groups
        </Typography>
      );
    }

    return (
      <List dense disablePadding>
        {instance.securityGroups.map((sg, index) => (
          <React.Fragment key={sg.groupId}>
            <ListItem disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 500 }}>
                      {sg.groupId}
                    </Typography>
                    <Tooltip title={`Copy security group ID`}>
                      <IconButton
                        size="small"
                        onClick={() => void handleCopyToClipboard(sg.groupId, 'Security Group ID')}
                        sx={{ p: 0.5 }}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                secondary={sg.groupName}
              />
            </ListItem>
            {index < (instance.securityGroups?.length ?? 0) - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Network Configuration
          </Typography>

          <Grid container spacing={3}>
            {/* IP Addresses */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {renderCopyableField(
                  'Public IP Address',
                  instance.publicIp ?? instance.publicIpAddress,
                  <PublicIcon fontSize="small" color="primary" />
                )}
                {renderCopyableField(
                  'Private IP Address',
                  instance.privateIp || instance.privateIpAddress,
                  <PrivateIcon fontSize="small" color="secondary" />
                )}
              </Box>
            </Grid>

            {/* VPC & Subnet */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {renderCopyableField(
                  'VPC ID',
                  instance.vpcId,
                  <RouterIcon fontSize="small" color="primary" />
                )}
                {renderCopyableField(
                  'Subnet ID',
                  instance.subnetId,
                  <DnsIcon fontSize="small" color="secondary" />
                )}
              </Box>
            </Grid>

            {/* Security Groups */}
            <Grid item xs={12}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SecurityIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="textSecondary">
                    Security Groups
                  </Typography>
                  {instance.securityGroups && instance.securityGroups.length > 0 && (
                    <Chip label={instance.securityGroups.length} size="small" color="primary" />
                  )}
                </Box>
                {renderSecurityGroups()}
              </Box>
            </Grid>

            {/* Additional Network Info */}
            {(instance.keyName ?? instance.instanceProfile) && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {instance.keyName && renderCopyableField('Key Pair', instance.keyName)}
                  {instance.instanceProfile &&
                    renderCopyableField('IAM Instance Profile', instance.instanceProfile.arn)}
                </Box>
              </Grid>
            )}
          </Grid>

          {!instance.vpcId && !instance.subnetId && !instance.securityGroups?.length && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Network information is not available for this instance. This may be due to the
              instance being in a terminated state or insufficient permissions.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={`${copiedText} copied to clipboard`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};
