import GameStage from '@/components/game/GameStage';
import RoomSetup from '@/components/RoomSetup';
import { useRoom } from '@/hooks/useRoom';

// Página única do app: a entrada enquanto não há sala e a mesa depois disso.
const Index = () => {
  const room = useRoom();

  if (room.phase === 'playing' && room.view) {
    return <GameStage room={room} view={room.view} />;
  }

  return (
    <RoomSetup
      busy={room.phase !== 'lobby'}
      resumingRoom={room.resumingRoom}
      transport={room.transport}
      onCreateRoom={room.create}
      onJoinRoom={room.join}
    />
  );
};

export default Index;
