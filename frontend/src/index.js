import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // This should contain the Tailwind directives
import App from './App';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    themeVariables: {
        primaryColor: '#f79321',
        primaryTextColor: '#333',
        primaryBorderColor: '#f79321',
        lineColor: '#f79321',
        secondaryColor: '#fff',
        tertiaryColor: '#fff'
    },
    flowchart: {
        htmlLabels: true,
        curve: 'basis',
        rankSpacing: 100,
        nodeSpacing: 100,
        padding: 20
    }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);