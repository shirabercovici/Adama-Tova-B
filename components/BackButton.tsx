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
        transition: 'transform 0.1s'
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <img
        src="/Top Bar Button.png"
        alt="Back"
        style={{ width: '28px', height: '28px' }}
      />
    </button >
  );
}