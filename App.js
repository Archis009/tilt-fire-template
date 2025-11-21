import { StatusBar } from "expo-status-bar";
import { TouchableWithoutFeedback } from "react-native";
import { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { Accelerometer } from "expo-sensors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 30; // Lava cannon shape
const BULLET_WIDTH = 12;
const BULLET_HEIGHT = 25;
const ENEMY_SIZE = 45; // Meteor size

export default function App() {
  const [playerX, setPlayerX] = useState((screenWidth - PLAYER_WIDTH) / 2);
  const [bullets, setBullets] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const bulletsRef = useRef([]);
  const enemiesRef = useRef([]);
  const playerXRef = useRef(playerX);

  useEffect(() => {
    bulletsRef.current = bullets;
  }, [bullets]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  // Accelerometer movement
  useEffect(() => {
    Accelerometer.setUpdateInterval(16);
    const sub = Accelerometer.addListener(({ x }) => {
      if (gameOver) return;

      const move = x * 20;
      setPlayerX((prevX) => {
        const newX = prevX + move;
        return Math.max(0, Math.min(newX, screenWidth - PLAYER_WIDTH));
      });
    });
    return () => sub.remove();
  }, [gameOver]);

  // Spawn meteors (lava rocks)
  useEffect(() => {
    if (gameOver) return;

    const spawn = setInterval(() => {
      const enemy = {
        id: Date.now().toString() + Math.random(),
        x: Math.random() * (screenWidth - ENEMY_SIZE),
        y: -ENEMY_SIZE,
      };

      enemiesRef.current = [...enemiesRef.current, enemy];
      setEnemies(enemiesRef.current);
    }, 900);

    return () => clearInterval(spawn);
  }, [gameOver]);

  // Main loop
  useEffect(() => {
    if (gameOver) return;

    const tick = setInterval(() => {
      const prevBullets = bulletsRef.current;
      const prevEnemies = enemiesRef.current;

      // Move fire bullets upward
      const movedBullets = prevBullets
        .map((b) => ({ ...b, y: b.y - 12 }))
        .filter((b) => b.y > -BULLET_HEIGHT);

      // Move lava meteors downward
      const movedEnemies = prevEnemies.map((e) => ({ ...e, y: e.y + 6 }));

      // Game over: meteor reaches ground
      for (let e of movedEnemies) {
        if (e.y + ENEMY_SIZE >= screenHeight - 20) {
          setGameOver(true);
          bulletsRef.current = [];
          enemiesRef.current = [];
          setBullets([]);
          setEnemies([]);
          return;
        }
      }

      // Remove off-screen meteors
      const filteredEnemies = movedEnemies.filter(
        (e) => e.y < screenHeight + ENEMY_SIZE
      );

      // Bullet collision detection
      const remainingBullets = [];
      const remainingEnemies = [...filteredEnemies];
      let hits = 0;

      for (let b of movedBullets) {
        let hit = false;

        for (let i = 0; i < remainingEnemies.length; i++) {
          const e = remainingEnemies[i];

          const collide =
            b.x < e.x + ENEMY_SIZE &&
            b.x + BULLET_WIDTH > e.x &&
            b.y < e.y + ENEMY_SIZE &&
            b.y + BULLET_HEIGHT > e.y;

          if (collide) {
            hit = true;
            hits++;
            remainingEnemies.splice(i, 1);
            break;
          }
        }

        if (!hit) remainingBullets.push(b);
      }

      // Player collision with meteors
      const playerTop = screenHeight - PLAYER_HEIGHT - 25;

      for (let e of remainingEnemies) {
        const collide =
          e.x < playerXRef.current + PLAYER_WIDTH &&
          e.x + ENEMY_SIZE > playerXRef.current &&
          e.y + ENEMY_SIZE > playerTop;

        if (collide) {
          setGameOver(true);
          bulletsRef.current = [];
          enemiesRef.current = [];
          setBullets([]);
          setEnemies([]);
          return;
        }
      }

      bulletsRef.current = remainingBullets;
      enemiesRef.current = remainingEnemies;
      setBullets(remainingBullets);
      setEnemies(remainingEnemies);

      if (hits > 0) setScore((s) => s + hits);
    }, 16);

    return () => clearInterval(tick);
  }, [gameOver]);

  // Shoot fireball
  const handlePress = () => {
    if (gameOver) return restartGame();

    const bullet = {
      id: Date.now().toString() + Math.random(),
      x: playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
      y: screenHeight - PLAYER_HEIGHT - 40,
    };

    bulletsRef.current = [...bulletsRef.current, bullet];
    setBullets(bulletsRef.current);
  };

  const restartGame = () => {
    bulletsRef.current = [];
    enemiesRef.current = [];
    setBullets([]);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setPlayerX((screenWidth - PLAYER_WIDTH) / 2);
  };

  // Lava sparks background
  const LavaSparks = () => (
    <>
      {[...Array(50)].map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: Math.random() * screenHeight,
            left: Math.random() * screenWidth,
            width: 4,
            height: 4,
            backgroundColor: ["#ff9100", "#ff3d00", "#ff6d00"][
              Math.floor(Math.random() * 3)
            ],
            borderRadius: 4,
            opacity: Math.random(),
          }}
        />
      ))}
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={styles.container}>
        <LavaSparks />

        <Text style={styles.score}>Score: {score}</Text>

        {/* Lava Cannon Player */}
        <View style={[styles.player, { left: playerX }]} />

        {/* Fireball Bullets */}
        {bullets.map((b) => (
          <View
            key={b.id}
            style={[styles.bullet, { left: b.x, top: b.y }]}
          />
        ))}

        {/* Lava Meteors */}
        {enemies.map((e) => (
          <View
            key={e.id}
            style={[styles.enemy, { left: e.x, top: e.y }]}
          />
        ))}

        {gameOver && (
          <Text style={styles.gameOver}>🔥 GAME OVER 🔥{"\n"}Tap to Restart</Text>
        )}

        <StatusBar style="light" />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A0000", // Lava darkness
  },

  // Lava Cannon Player
  player: {
    position: "absolute",
    bottom: 25,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundColor: "#FF4500",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: "#ff6d00",
    shadowOpacity: 1,
    shadowRadius: 18,
  },

  // Fireball bullets
  bullet: {
    position: "absolute",
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    backgroundColor: "#FF6D00",
    borderRadius: 8,
    shadowColor: "#FF9100",
    shadowOpacity: 1,
    shadowRadius: 15,
  },

  // Meteor enemies
  enemy: {
    position: "absolute",
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    backgroundColor: "#8B0000",
    borderRadius: 999, // make it circular
    shadowColor: "#FF3D00",
    shadowOpacity: 1,
    shadowRadius: 25,
  },

  score: {
    position: "absolute",
    top: 80,
    left: 20,
    fontSize: 26,
    color: "#FF9100",
    textShadowColor: "#FF3D00",
    textShadowRadius: 18,
  },

  gameOver: {
    position: "absolute",
    top: screenHeight / 2 - 60,
    width: "100%",
    textAlign: "center",
    color: "#FF6D00",
    fontSize: 36,
    fontWeight: "bold",
    textShadowColor: "#FF3D00",
    textShadowRadius: 20,
  },
});