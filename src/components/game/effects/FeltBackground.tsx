import { useEffect, useState, type CSSProperties } from 'react';
import { FELT_TILE, feltTextureUrl } from '@/lib/feltTexture';

// Fundo da mesa: feltro verde ou vinho, como as mesas de jogo clássicas. A
// cor não passa por aqui: ela vem dos tokens trocados por data-felt em <html>.
// Camadas, de baixo para cima (ver .felt-bg em index.css): a cor do pano, a
// luz da luminária no centro, o escurecimento das bordas e a textura de
// tecido. É estático de propósito: um pano não se mexe, e um fundo parado não
// gasta bateria do celular.

const FeltBackground = () => {
  const [texture, setTexture] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void feltTextureUrl().then((url) => {
      if (alive) setTexture(url);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Enquanto a textura não fica pronta (um quadro ou dois), aparece só a cor
  // e a luz. Sem canvas, o fundo continua sendo um feltro liso.
  const style = { '--felt-texture': texture ? `url(${texture})` : 'none', '--felt-tile': `${FELT_TILE}px` } as CSSProperties;

  return <div className="felt-bg" style={style} aria-hidden="true" />;
};

export default FeltBackground;
