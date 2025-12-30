"use client";

export default function BackButton() {
  return (
    <button 
      onClick={() => window.history.back()}
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'auto', 
        height: 'auto', 
        backgroundColor: 'transparent', 
        border: 'none', 
        boxShadow: 'none',
        cursor: 'pointer',
        color: '#333',
        padding: '8px',
        marginLeft: '10px',
        transition: 'transform 0.1s'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}