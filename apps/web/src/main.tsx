import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return <div>EC2 Instance Manager</div>;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);