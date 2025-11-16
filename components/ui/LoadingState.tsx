import { LoadingSpinner } from './LoadingSpinner';

type Props = {
  message?: string;
  fullScreen?: boolean;
};

export function LoadingState({ message = 'Loading...', fullScreen = false }: Props) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="w-full">{content}</div>;
}

