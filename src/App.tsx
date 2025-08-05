// src/App.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import Game from "./pages/Game";
import { RoomSelect } from "./pages/RoomSelect";
import { Title } from "./pages/Title";

function App() {
  // App内で状態を持つ例
  const [name, setName] = React.useState("");
  const [roomId, setRoomId] = React.useState("");

  // Titleコンポーネントに渡すonJoin
  const handleJoin = (joinedName: string) => {
    console.log("join:", joinedName);
    setName(joinedName);
  };

  // RoomSelectコンポーネントに渡すonEnterRoom
  const handleEnterRoom = (selectedRoomId: string) => {
    console.log("enter room:", selectedRoomId);
    setRoomId(selectedRoomId);
  };

  return (
    <Routes>
      <Route path="/" element={<Title onJoin={handleJoin} />} />
      <Route path="/roomselect" element={<RoomSelect name={name} onEnterRoom={handleEnterRoom} />} />
      <Route path="/game" element={<Game />} />
    </Routes>
  );
}
