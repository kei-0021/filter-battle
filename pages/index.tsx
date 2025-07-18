import CardViewer from '../components/CardViewer';
import { cards } from '../data/cards';

export default function Home() {
  const card = cards[0]; // とりあえず1枚だけ

  return (
    <main>
      <h1 style={{ textAlign: 'center' }}>事件カード × フィルター体験</h1>
      <CardViewer card={card} />
    </main>
  );
}
