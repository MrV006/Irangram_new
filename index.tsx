import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

interface ErrorBoundaryProps {
  // Fix: Make children optional to resolve missing property error in strict usage
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary to catch crashes and show a readable error
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state property to resolve "Property 'state' does not exist" error
  public state: ErrorBoundaryState = { hasError: false, error: null };
  // Fix: Explicitly declare props to resolve "Property 'props' does not exist" error in some TS configurations
  public declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', 
          width: '100vw', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center',
          direction: 'ltr'
        }}>
          <h1 style={{fontSize: '24px', marginBottom: '10px'}}>Something went wrong</h1>
          <div style={{
            background: 'white', 
            padding: '15px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            overflow: 'auto',
            border: '1px solid #f5c6cb'
          }}>
             <pre style={{margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{this.state.error?.toString()}</pre>
          </div>
          <p style={{marginTop: '20px'}}>Please refresh the page or check the console.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);