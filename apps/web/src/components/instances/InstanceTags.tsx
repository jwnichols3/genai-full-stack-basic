import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Box,
  Chip,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface InstanceTagsProps {
  tags: Record<string, string>;
}

export const InstanceTags: React.FC<InstanceTagsProps> = ({ tags }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const tagEntries = useMemo(() => {
    return Object.entries(tags || {});
  }, [tags]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tagEntries;
    }

    const query = searchQuery.toLowerCase();
    return tagEntries.filter(
      ([key, value]) =>
        key.toLowerCase().includes(query) ||
        value.toLowerCase().includes(query)
    );
  }, [tagEntries, searchQuery]);

  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="textSecondary">
        No tags found for this instance
      </Typography>
    </Box>
  );

  const renderNoSearchResults = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="textSecondary">
        No tags match your search
      </Typography>
      <Typography variant="caption" color="textSecondary">
        Try a different search term
      </Typography>
    </Box>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="h3">
              Tags
            </Typography>
            {tagEntries.length > 0 && (
              <Chip
                label={tagEntries.length}
                size="small"
                color="primary"
              />
            )}
          </Box>
        </Box>

        {tagEntries.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {tagEntries.length > 5 && (
              <TextField
                fullWidth
                size="small"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            )}

            {filteredTags.length === 0 ? (
              renderNoSearchResults()
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          Key
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          Value
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTags.map(([key, value]) => (
                      <TableRow key={key} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{
                              wordBreak: 'break-word',
                              maxWidth: 200,
                            }}
                          >
                            {key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              wordBreak: 'break-word',
                              maxWidth: 300,
                            }}
                          >
                            {value}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {searchQuery && filteredTags.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Showing {filteredTags.length} of {tagEntries.length} tags
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};