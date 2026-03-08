import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">🏐</div>
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <Button onClick={() => navigate('/')}>Go Home</Button>
    </div>
  );
}
