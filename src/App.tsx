// src/App.tsx
import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SocketProvider } from "./SocketContext";
import Game from "./pages/Game";
import { RoomSelect } from "./pages/RoomSelect";
import { Title } from "./pages/Title";

function App() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleJoin = (joinedName: string) => {
    console.log("join:", joinedName);
    setName(joinedName);
  };

  const handleEnterRoom = (selectedRoomId: string) => {
    console.log("enter room:", selectedRoomId);
    setRoomId(selectedRoomId);
  };

  return (
    <SocketProvider>
      <Routes>
        <Route
          path="/"
          element={
            !name ? (
              <Title onJoin={handleJoin} />
            ) : (
              <Navigate to="/roomselect" replace />
            )
          }
        />
        <Route
          path="/roomselect"
          element={
            !name ? (
              <Navigate to="/" replace />
            ) : (
              <RoomSelect name={name} onEnterRoom={handleEnterRoom} />
            )
          }
        />
        <Route
          path="/game"
          element={
            roomId ? (
              <Game name={name} roomId={roomId} />
            ) : (
              <Navigate to="/roomselect" replace />
            )
          }
        />
      </Routes>
    </SocketProvider>
  );
}

export default App;
