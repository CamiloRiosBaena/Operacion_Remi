import logoUrl from '@/assets/logo.png';

interface Props {
  size?: number;
}

export function RemiLogo({ size = 100 }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Remi"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
      draggable={false}
    />
  );
}
