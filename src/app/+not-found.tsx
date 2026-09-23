import { Redirect } from 'expo-router';

/** Непознат адрес (напр. когато уеб версията е качена в подпапка) — към началния екран. */
export default function NotFound() {
  return <Redirect href="/" />;
}
