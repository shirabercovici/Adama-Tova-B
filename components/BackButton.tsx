"use client";

export default function BackButton() {
  return (
    <button 
      onClick={() => window.history.back()}
      style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px', 
        height: '40px', 
        borderRadius: '50%',
        backgroundColor: 'white', 
        border: '1px solid #ccc', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#333',
        padding: 0,
        marginLeft: '10px',
        transition: 'transform 0.1s'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {'>'}
    </button>
  );
}