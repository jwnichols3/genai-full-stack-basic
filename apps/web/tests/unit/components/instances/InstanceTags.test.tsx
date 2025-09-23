import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../../src/styles/theme';
import { InstanceTags } from '../../../../src/components/instances/InstanceTags';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('InstanceTags', () => {
  it('should render empty state when no tags are provided', () => {
    render(
      <TestWrapper>
        <InstanceTags tags={{}} />
      </TestWrapper>
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('No tags found for this instance')).toBeInTheDocument();
  });

  it('should render tags table when tags are provided', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Tag count chip

    // Check table headers
    expect(screen.getByText('Key')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Check tag data
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Instance')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('MyProject')).toBeInTheDocument();
  });

  it('should not show search field when there are 5 or fewer tags', () => {
    const tags = {
      Name: 'Test',
      Env: 'prod',
      Project: 'test',
      Owner: 'user',
      Type: 'web'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    expect(screen.queryByPlaceholderText('Search tags...')).not.toBeInTheDocument();
  });

  it('should show search field when there are more than 5 tags', () => {
    const tags = {
      Name: 'Test',
      Environment: 'prod',
      Project: 'test',
      Owner: 'user',
      Type: 'web',
      CostCenter: '123'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
  });

  it('should filter tags based on search query', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject',
      Owner: 'john.doe',
      Type: 'web-server',
      CostCenter: '12345'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search for 'prod'
    fireEvent.change(searchInput, { target: { value: 'prod' } });

    // Should show Environment tag (value contains 'prod')
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();

    // Should not show other tags
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
  });

  it('should filter tags based on key search', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search for 'name'
    fireEvent.change(searchInput, { target: { value: 'name' } });

    // Should show Name tag (key contains 'name')
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Instance')).toBeInTheDocument();

    // Should not show other tags
    expect(screen.queryByText('Environment')).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
  });

  it('should show no search results message when search yields no results', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No tags match your search')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  it('should show search results info when filtering', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject',
      Owner: 'john.doe',
      Type: 'web-server',
      CostCenter: '12345'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search for 'test' (should match Name value and Project value)
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('Showing 1 of 6 tags')).toBeInTheDocument();
  });

  it('should clear search results when search input is cleared', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'production',
      Project: 'MyProject'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search for something
    fireEvent.change(searchInput, { target: { value: 'prod' } });
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Should show all tags again
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('should handle undefined tags gracefully', () => {
    render(
      <TestWrapper>
        <InstanceTags tags={undefined as any} />
      </TestWrapper>
    );

    expect(screen.getByText('No tags found for this instance')).toBeInTheDocument();
  });

  it('should handle null tags gracefully', () => {
    render(
      <TestWrapper>
        <InstanceTags tags={null as any} />
      </TestWrapper>
    );

    expect(screen.getByText('No tags found for this instance')).toBeInTheDocument();
  });

  it('should render tag count chip with correct count', () => {
    const tags = {
      Name: 'Test',
      Environment: 'prod'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should not show tag count chip when no tags', () => {
    render(
      <TestWrapper>
        <InstanceTags tags={{}} />
      </TestWrapper>
    );

    // Tag count chip should not be visible for empty tags
    const chips = screen.queryAllByText(/^\d+$/);
    expect(chips).toHaveLength(0);
  });

  it('should handle long tag keys and values with proper text wrapping', () => {
    const tags = {
      'very-long-tag-key-that-might-cause-layout-issues': 'very-long-tag-value-that-might-also-cause-layout-issues-and-should-wrap-properly',
      'another-long-key': 'short-value'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    expect(screen.getByText('very-long-tag-key-that-might-cause-layout-issues')).toBeInTheDocument();
    expect(screen.getByText('very-long-tag-value-that-might-also-cause-layout-issues-and-should-wrap-properly')).toBeInTheDocument();
  });

  it('should be case-insensitive in search', () => {
    const tags = {
      Name: 'Test Instance',
      Environment: 'PRODUCTION'
    };

    render(
      <TestWrapper>
        <InstanceTags tags={tags} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tags...');

    // Search with lowercase when value is uppercase
    fireEvent.change(searchInput, { target: { value: 'production' } });

    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTION')).toBeInTheDocument();
  });
});