import React from 'react';
import Relatorio from './components/Relatorio';

const RelatorioPage = () => {
  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  return <Relatorio onClose={handleClose} />;
};

export default RelatorioPage;
