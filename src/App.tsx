import { Routes, Route, Navigate } from 'react-router-dom';
import TabBar from './components/TabBar';
import Home from './screens/Home';
import Movies from './screens/Movies';
import Anime from './screens/Anime';
import Search from './screens/Search';
import Library from './screens/Library';
import MovieDetail from './screens/MovieDetail';
import AnimeDetail from './screens/AnimeDetail';
import MovieWatch from './screens/MovieWatch';
import AnimeWatch from './screens/AnimeWatch';
import GenreResults from './screens/GenreResults';
import Splash from './screens/Splash';
import { useEffect, useState } from 'react';
import { useNativeShell } from './lib/native';

const TAB_ROUTES = ['/', '/movies', '/anime', '/search', '/library'];

export default function App() {
  useNativeShell();
  const [splashDone, setSplashDone] = useState(() => {
    // only show splash once per app session
    return sessionStorage.getItem('azkahps:splash') !== '1';
  });

  useEffect(() => {
    if (!splashDone) return;
    sessionStorage.setItem('azkahps:splash', '1');
  }, [splashDone]);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  const path = window.location.hash.replace(/^#/, '') || '/';
  const showTabs = TAB_ROUTES.includes(path);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col bg-bg">
      <main className={`flex-1 ${showTabs ? 'pb-[104px]' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/anime" element={<Anime />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/movie/:slug" element={<MovieDetail />} />
          <Route path="/anime/:id/:slug" element={<AnimeDetail />} />
          <Route path="/watch/movie/:slug" element={<MovieWatch />} />
          <Route path="/watch/anime/:id/:slug/:ep" element={<AnimeWatch />} />
          <Route path="/genre/movie/:genre" element={<GenreResults kind="movie" />} />
          <Route path="/genre/anime/:slug" element={<GenreResults kind="anime" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showTabs && <TabBar />}
    </div>
  );
}
