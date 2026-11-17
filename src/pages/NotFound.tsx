import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

const NotFound = () => {
  const t = useT();
  return (
    <div className="lobby">
      <div className="panel relative z-10 w-full max-w-sm p-6 text-center">
        <p className="text-5xl font-bold text-primary">404</p>
        <h1 className="mt-2 text-xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('notFound.text')}</p>
        {/* Link do roteador, e não <a href="/">: o app é servido em um subcaminho. */}
        <Link to="/" className={buttonVariants({ className: 'mt-5 w-full' })}>
          {t('notFound.back')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
