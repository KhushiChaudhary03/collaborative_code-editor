  import './App.css';
  import {BrowserRouter, Routes, Route} from 'react-router-dom'
  import Home from './pages/Home';
  import EditorPage from './pages/EditorPage';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
    <div>
      <Toaster
        position="top-right"
        toastOptions={{
          success:{
            theme:{
              primary:"rgba(0, 195, 255, 0.14)",
            }
          }
        }}></Toaster>
    </div>
      <BrowserRouter>
        <Routes>
          <Route path ="/" element={<Home/>}/>
          <Route path ="/editor/:roomId" element={<EditorPage/>}/>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
