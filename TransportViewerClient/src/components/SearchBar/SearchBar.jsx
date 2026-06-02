import React from 'react';
import './SearchBar.css';

const SearchIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function SearchBar({ termoBusca, setTermoBusca, placeholder = "Buscar em todos os campos..." }) {
  return (
    <div className="search-bar">
      <div className="search-bar__icon">
        <SearchIcon />
      </div>
      <input
        type="text"
        className="search-bar__input"
        placeholder={placeholder}
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
      />
      {termoBusca && (
        <button 
          className="search-bar__clear" 
          onClick={() => setTermoBusca('')}
          title="Limpar busca"
        >
          ✕
        </button>
      )}
    </div>
  );
}