import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import Chart from 'chart.js/auto';
import { Chart as ChartJS } from 'chart.js';
import 'chartjs-adapter-date-fns';
import FullCalendar from '@fullcalendar/react'; // Correct import
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import scrollGridPlugin from '@fullcalendar/scrollgrid'; // New import for ScrollGrid
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './App.css';

const firebaseConfig = {
  apiKey: "AIzaSyDIngY4WuK5MZHhymOcbgMB0usEJkNyfz4",
  authDomain: "project-management-tool-32f09.firebaseapp.com",
  projectId: "project-management-tool-32f09",
  storageBucket: "project-management-tool-32f09.firebasestorage.app",
  messagingSenderId: "225080557033",
  appId: "1:225080557033:web:86d8da82e1ad552d9e5f78"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const GOOGLE_DRIVE_FOLDER_ID = '1YufVHMBcoVrd5nlJkEZlu0fYaqPuX3QG'; // Replace with env var if using .env
const CLIENT_ID = '225080557033-u89ctvs8kq7bg2qp4fa86gc9mo9p8rf1.apps.googleusercontent.com'; // Replace with your actual Client ID



function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [spending, setSpending] = useState([]);
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [pinterestPins, setPinterestPins] = useState([]);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const appRef = useRef(null);
  const [isDomReady, setIsDomReady] = useState(false);

  // Effect to initialize Firebase once DOM is confirmed ready
  useEffect(() => {
    if (!appRef.current) {
      console.warn('DOM element #app not found, Firebase setup delayed');
      setError('DOM not ready, please refresh.');
      return;
    }
    setIsDomReady(true); // Mark DOM as ready
    console.log('Setting up auth state listener with DOM ready');
    let unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed, user:', user);
      setUser(user);
      if (user) {
        console.log('User authenticated, UID:', user.uid);
        onSnapshot(collection(db, 'tasks'), (snapshot) => {
          const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Tasks data:', tasksData);
          setTasks(tasksData);
        }, (error) => {
          console.error('Tasks snapshot error:', error);
        });
        onSnapshot(collection(db, 'notes'), (snapshot) => {
          setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          console.error('Notes snapshot error:', error);
        });
        onSnapshot(collection(db, 'spending'), (snapshot) => {
          setSpending(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          console.error('Spending snapshot error:', error);
        });
        onSnapshot(collection(db, 'items'), (snapshot) => {
          setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          console.error('Items snapshot error:', error);
        });
        onSnapshot(collection(db, 'photos'), (snapshot) => {
          setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
          console.error('Photos snapshot error:', error);
        });
        setPinterestPins([{ id: '1', image: 'https://placehold.co/150x150', url: '#', title: 'Sample Pin' }]);
      } else {
        console.log('No user, clearing data');
        setTasks([]);
        setNotes([]);
        setSpending([]);
        setItems([]);
        setPhotos([]);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
    });
    return () => unsubscribe && unsubscribe();
  }, [appRef]); // Triggered when appRef is set

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      console.log('Attempting login with popup');
      const result = await signInWithPopup(auth, provider);
      console.log('Login successful, result:', result.user);
    } catch (error) {
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        email: error.email,
        credential: error.credential,
        customData: error.customData,
      });
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn('Popup request cancelled, possibly due to browser block. Please try again.');
      } else {
        setError('Login failed: ' + error.message + ' (Code: ' + error.code + ')');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <div ref={appRef} className="flex justify-center items-center h-screen bg-gray-100">
        <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">Login with Google</button>
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </div>
    );
  }

    return (
    <div ref={appRef} className="p-4 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Project Management Tool</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </div>
      <div className="flex flex-col gap-4">
        <GanttChart tasks={tasks} db={db} user={user} setTasks={setTasks} />
        <NotesSection notes={notes} db={db} user={user} />
        <CalendarSection photos={photos} db={db} storage={storage} user={user} setPhotos={setPhotos} />
        <SpendingTracker spending={spending} db={db} user={user} setSpending={setSpending} gapiLoaded={gapiLoaded} />
        <ItemsUnderConsideration items={items} db={db} user={user} />
        <GoogleDriveSection googleDriveFolder={GOOGLE_DRIVE_FOLDER_ID} />
        <PinterestSection pins={pinterestPins} />
      </div>
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );

}

function GanttChart({ tasks, db, user, setTasks }) {
  const canvasRef = useRef(null);
  const [newTask, setNewTask] = useState({ title: '', startDate: '', endDate: '', assignedTo: '', completed: false });
  const USERS = ['Brayden', 'Cami', 'Diane', 'J.D.']; // Fixed user list
  const tableRef = useRef(null); // Reference to the table for hover effect

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const taskCount = tasks.length || 1; // Ensure at least 1 task for minimum height
      const canvasHeight = Math.max(50, taskCount * 20 + 10); // Minimum 100px, 40px per task + 20px padding
      canvasRef.current.style.height = `${canvasHeight}px`;
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: tasks.map(task => task.title), // Task names on y-axis
          datasets: [{
            label: 'Tasks',
            data: tasks.map(task => ({
              x: [new Date(task.startDate + 'T00:00:00'), new Date(task.endDate + 'T00:00:00')], // Force local midnight
              y: task.title,
            })),
            backgroundColor: tasks.map(task => {
              const baseColor = userColors[task.assignedTo] || 'rgba(0, 0, 0, 0.5)'; // Default gray
              return task.completed ? adjustTransparency(baseColor, 0.5) : baseColor; // 50% transparent when completed
            }),
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            barThickness: 40, // Changed to 40px bar height
          }],
        },
        options: {
          indexAxis: 'y', // Horizontal bars
          scales: {
            x: {
              type: 'time',
              time: { unit: 'day' },
              min: new Date('2025-10-01T00:00:00'),
              max: new Date('2026-04-30T00:00:00'),
              title: { display: true, text: 'Timeline' },
            },
            y: {
              title: { display: true, text: 'Tasks' },
            },
          },
          plugins: {
            legend: { display: false },
          },
          onHover: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const taskTitle = tasks[index]?.title;
              if (taskTitle && tableRef.current) {
                const rows = tableRef.current.getElementsByTagName('tr');
                for (let row of rows) {
                  if (row.cells[2].textContent === taskTitle) { // Column 2 is Title
                    row.style.backgroundColor = 'rgba(255, 255, 204, 0.5)'; // Soft yellow
                  } else {
                    row.style.backgroundColor = '';
                  }
                }
              }
            } else if (tableRef.current) {
              const rows = tableRef.current.getElementsByTagName('tr');
              for (let row of rows) {
                row.style.backgroundColor = '';
              }
            }
          },
        },
      });
      return () => chart.destroy();
    }
  }, [tasks]);

  // Helper function to adjust transparency
  const adjustTransparency = (color, opacity) => {
    const rgba = color.match(/\d+\.?\d*/g);
    return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${opacity})`;
  };

  const addTask = async () => {
    if (newTask.title && newTask.startDate && newTask.endDate && newTask.assignedTo) {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        completed: false,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
      });
      setNewTask({ title: '', startDate: '', endDate: '', assignedTo: '', completed: false });
    }
  };

  const toggleCompleted = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      await updateDoc(doc(db, 'tasks', id), { completed: !task.completed });
    }
  };

  const reOpenTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (task && task.completed) {
      await updateDoc(doc(db, 'tasks', id), { completed: false });
    }
  };

  const saveEdit = async (id, updatedTask) => {
    await updateDoc(doc(db, 'tasks', id), updatedTask);
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, ...updatedTask } : task));
  };

  const deleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
        console.log(`Deleted task with ID: ${id}`);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const userColors = {
    'Brayden': 'rgba(255, 99, 132, 1.0)', // Red
    'Cami': 'rgba(54, 162, 235, 1.0)',   // Blue
    'Diane': 'rgba(75, 192, 192, 1.0)',  // Teal
    'J.D.': 'rgba(255, 205, 86, 1.0)',   // Yellow
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Gantt Chart (Oct 1, 2025 - Apr 30, 2026)</h2>
      <canvas ref={canvasRef} style={{ width: '100%', height: '200px' }}></canvas>
      <div className="mt-2">
        <strong>Legend:</strong>
        <ul className="list-none flex space-x-4">
          {USERS.map(user => (
            <li key={user} className="flex items-center">
              <div style={{ width: '15px', height: '15px', backgroundColor: userColors[user].replace('1.0', '0.5'), marginRight: '5px' }}></div>
              {user}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          placeholder="Task Title"
          className="border p-1 rounded w-1/5"
        />
        <input
          type="date"
          min="2025-10-01"
          max="2026-04-30"
          value={newTask.startDate}
          onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
          className="border p-1 rounded w-1/5"
        />
        <input
          type="date"
          min="2025-10-01"
          max="2026-04-30"
          value={newTask.endDate}
          onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
          className="border p-1 rounded w-1/5"
        />
        <select
          value={newTask.assignedTo}
          onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
          className="border p-1 rounded w-1/5"
        >
          <option value="">Select User</option>
          {USERS.map((userOption, index) => (
            <option key={index} value={userOption}>{userOption}</option>
          ))}
        </select>
        <button
          onClick={addTask}
          className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 w-1/5"
          disabled={!newTask.title || !newTask.startDate || !newTask.endDate || !newTask.assignedTo}
        >
          Add
        </button>
      </div>
      <table ref={tableRef} className="table table-striped table-hover w-full mt-4" style={{ fontFamily: 'monospace' }}>
        <thead className="table-dark">
          <tr>
            <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
            <th style={{ width: '5%', textAlign: 'center' }}>Status</th>
            <th style={{ width: '40%', textAlign: 'center' }}>Title</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Start Date</th>
            <th style={{ width: '10%', textAlign: 'center' }}>End Date</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Assigned</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Created By</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="text-center">
                <button
                  onClick={() => toggleCompleted(task.id)}
                  className="bg-transparent text-yellow-500 px-2 py-1 rounded mr-1 text-lg"
                  disabled={task.completed}
                  title="Completed"
                >
                  ✓
                </button>
                <button
                  onClick={() => reOpenTask(task.id)}
                  className="bg-transparent text-green-500 px-2 py-1 rounded mr-1 text-lg"
                  disabled={!task.completed}
                  title="ReOpen"
                >
                  🚪
                </button>
                <button
                  onClick={() => {
                    setNewTask({ ...task, id: task.id }); // Enable inline editing
                  }}
                  className="bg-transparent text-blue-500 px-2 py-1 rounded mr-1 text-lg"
                  title="Edit"
                >
                  📝
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="bg-transparent text-red-500 px-2 py-1 rounded text-lg"
                  title="Delete"
                >
                  ✖
                </button>
              </td>
              <td className="text-center">{task.completed ? '✓' : '☐'}</td>
              <td className="text-center">
                {task.id === newTask.id ? (
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="border p-1 rounded w-full text-center"
                  />
                ) : (
                  task.title
                )}
              </td>
              <td className="text-center">
                {task.id === newTask.id ? (
                  <input
                    type="date"
                    min="2025-10-01"
                    max="2026-04-30"
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    className="border p-1 rounded w-full text-center"
                  />
                ) : (
                  new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })
                )}
              </td>
              <td className="text-center">
                {task.id === newTask.id ? (
                  <input
                    type="date"
                    min="2025-10-01"
                    max="2026-04-30"
                    value={newTask.endDate}
                    onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                    className="border p-1 rounded w-full text-center"
                  />
                ) : (
                  new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })
                )}
              </td>
              <td className="text-center">
                {task.id === newTask.id ? (
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="border p-1 rounded w-full text-center"
                  >
                    <option value="">Select User</option>
                    {USERS.map((userOption, index) => (
                      <option key={index} value={userOption}>{userOption}</option>
                    ))}
                  </select>
                ) : (
                  task.assignedTo
                )}
              </td>
              <td className="text-center">{task.createdBy}</td>
              <td className="text-center">
                {task.id === newTask.id ? (
                  <button
                    onClick={() => saveEdit(task.id, newTask)}
                    className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Save
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



function NotesSection({ notes, db, user }) {
  const [newNote, setNewNote] = useState({ content: '', link: '', createdBy: '' });
  const USERS = ['Brayden', 'Cami', 'Diane', 'J.D.']; // Fixed user list

  const addNote = async () => {
    if (newNote.content && newNote.createdBy) {
      await addDoc(collection(db, 'notes'), {
        content: newNote.content,
        link: newNote.link,
        createdBy: newNote.createdBy,
        createdAt: new Date().toISOString()
      });
      setNewNote({ content: '', link: '', createdBy: '' });
    }
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, 'notes', id));
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Project Notes</h2>
      <table className="table table-striped table-hover w-full" style={{ fontFamily: 'monospace' }}>
        <thead className="table-dark">
          <tr>
            <th style={{ width: '40%', textAlign: 'center' }}>Content</th>
            <th style={{ width: '20%', textAlign: 'center' }}>Link</th>
            <th style={{ width: '20%', textAlign: 'center' }}>Created By</th>
            <th style={{ width: '20%', textAlign: 'center' }}>Date Added</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Input row for adding new note */}
          <tr>
            <td className="text-center">
              <input
                type="text"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Note Content"
                className="border p-1 rounded w-full text-center"
              />
            </td>
            <td className="text-center">
              <input
                type="url"
                value={newNote.link}
                onChange={(e) => setNewNote({ ...newNote, link: e.target.value })}
                placeholder="Link (optional)"
                className="border p-1 rounded w-full text-center"
              />
            </td>
            <td className="text-center">
              <select
                value={newNote.createdBy}
                onChange={(e) => setNewNote({ ...newNote, createdBy: e.target.value })}
                className="border p-1 rounded w-full text-center"
              >
                <option value="">Select User</option>
                {USERS.map((userOption, index) => (
                  <option key={index} value={userOption}>{userOption}</option>
                ))}
              </select>
            </td>
            <td className="text-center">-</td>
            <td className="text-center">
              <button
                onClick={addNote}
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                disabled={!newNote.content || !newNote.createdBy}
              >
                Add
              </button>
            </td>
          </tr>
          {/* Existing notes */}
          {notes.map((note) => (
            <tr key={note.id}>
              <td className="text-center">{note.content}</td>
              <td className="text-center">
                {note.link ? (
                  <a
                    href={note.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    View Link
                  </a>
                ) : (
                  '-'
                )}
              </td>
              <td className="text-center">{note.createdBy}</td>
              <td className="text-center">
                {new Date(note.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: '2-digit',
                })}
              </td>
              <td className="text-center">
                <button
                  onClick={() => deleteNote(note.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarSection({ photos, db, storage, user, setPhotos }) {
  const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [uploadFiles, setUploadFiles] = useState([]);
  const [tags, setTags] = useState({});
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [error, setError] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [editingTags, setEditingTags] = useState({}); // Added missing state for editing tags

  // Filter photos for the selected date
  const dateKey = selectedDate.toISOString().split('T')[0];
  const filteredPhotos = photos.filter(photo => {
    const photoDate = new Date(photo.createdAt).toISOString().split('T')[0];
    return photoDate === dateKey;
  });

  // Handle date click
  const handleDateClick = arg => {
    setSelectedDate(arg.date);
    setUploadFiles([]);
    setTags({});
    setUploadDate(arg.date.toISOString().split('T')[0]);
    setError('');
  };

  // Handle file selection
  const handleFileChange = e => {
    setUploadFiles(Array.from(e.target.files));
    setError('');
  };

  // Handle upload date change
  const handleUploadDateChange = e => {
    setUploadDate(e.target.value);
  };

  // Upload photos
  const uploadPhotos = async () => {
    if (!uploadFiles.length) {
      setError('No files selected.');
      return;
    }
    if (!uploadDate) {
      setError('Please select an upload date.');
      return;
    }
    try {
      const dateStr = uploadDate;
      console.log('Uploading photos for date:', dateStr, 'by user:', user.email);
      const newPhotos = [];
      const uploadPromises = uploadFiles.map(async file => {
        console.log('Uploading file:', file.name);
        const storageRef = ref(storage, `photos/${user.email}/${dateStr}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        const tag = tags[file.name] || '';
        const docRef = await addDoc(collection(db, 'photos'), {
          url,
          createdBy: user.email,
          createdAt: dateStr,
          tag,
        });
        console.log('Added Firestore doc:', docRef.id);
        newPhotos.push({
          id: docRef.id,
          url,
          createdBy: user.email,
          createdAt: dateStr,
          tag,
        });
      });
      await Promise.all(uploadPromises);
      setPhotos(prev => {
        const existingIds = prev.map(p => p.id);
        const uniques = newPhotos.filter(np => !existingIds.includes(np.id));
        return [...prev, ...uniques];
      });
      setUploadFiles([]);
      setTags({});
      setUploadDate(selectedDate.toISOString().split('T')[0]);
      setError('');
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed: ' + err.message);
    }
  };

  // Update photo tag
  const updatePhotoTag = async (photoId, newTag) => {
    try {
      console.log('Updating tag for photo:', photoId, 'to:', newTag);
      await updateDoc(doc(db, 'photos', photoId), { tag: newTag });
      setPhotos(prev =>
        prev.map(photo =>
          photo.id === photoId ? { ...photo, tag: newTag } : photo
        )
      );
      setEditingTags(prev => ({ ...prev, [photoId]: undefined }));
      setError('');
    } catch (err) {
      console.error('Tag update failed:', err);
      setError('Failed to update tag: ' + err.message);
    }
  };

  // Delete photo
  const deletePhoto = async photoId => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) throw new Error('Photo not found in state');
      const decodedUrl = decodeURIComponent(photo.url);
      const fileName = decodedUrl.split('/').pop().split('?')[0];
      console.log('Deleting photo:', { photoId, url: photo.url, fileName, date: photo.createdAt });
      const storagePath = `photos/${user.email}/${new Date(photo.createdAt).toISOString().split('T')[0]}/${fileName}`;
      console.log('Storage path:', storagePath);
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log('Deleted from Storage:', storagePath);
      await deleteDoc(doc(db, 'photos', photoId));
      console.log('Deleted from Firestore:', photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Delete failed: ' + err.message);
    }
  };

  // Open carousel at specific index
  const openCarousel = idx => {
    setCarouselIndex(idx);
    setIsCarouselOpen(true);
  };

  const sliderSettings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    initialSlide: carouselIndex,
    afterChange: cur => setCarouselIndex(cur),
  };

  // Calendar events with camera icon
  const events = photos.map(photo => {
    // Ensure date is treated as local by splitting the ISO string
    const [year, month, day] = photo.createdAt.split('-');
    const localDate = new Date(year, month - 1, day); // month is 0-based
    return {
      title: '', // No title to avoid text display
      start: localDate,
      allDay: true,
      classNames: ['photo-day'],
    };
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Project Calendar</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {/* FullCalendar */}
      <div className="mb-6">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, scrollGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          ref={calendarRef}
          height="auto"
          dayMaxEvents={true}
          schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        />
      </div>
      {/* Upload UI */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow-inner">
        <input
          type="date"
          value={uploadDate}
          onChange={handleUploadDateChange}
          className="border border-gray-300 p-2 rounded-lg w-full mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Select upload date"
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="mb-2 border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {uploadFiles.length > 0 && (
          <input
            type="text"
            value={tags[uploadFiles[0]?.name] || ''}
            onChange={e => setTags({ ...tags, [uploadFiles[0].name]: e.target.value })}
            placeholder="Tag (optional)"
            className="border border-gray-300 p-2 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        )}
        <button
          onClick={uploadPhotos}
          disabled={!uploadFiles.length || !uploadDate}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          Upload Photos
        </button>
      </div>
      {/* Thumbnail Grid */}
      {filteredPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {filteredPhotos.map((photo, idx) => (
            <div key={photo.id} className="relative">
              <img
                src={photo.url}
                alt={photo.tag || 'Photo'}
                className="w-full h-96 md:h-[512px] object-contain rounded cursor-pointer"
                onClick={() => openCarousel(idx)}
              />
              <div className="text-center mt-1">
                <input
                  type="text"
                  value={editingTags[photo.id] ?? photo.tag ?? ''}
                  onChange={e => setEditingTags({ ...editingTags, [photo.id]: e.target.value })}
                  placeholder="Enter tag"
                  className="border border-gray-300 p-1 rounded w-full text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => updatePhotoTag(photo.id, editingTags[photo.id] ?? photo.tag ?? '')}
                  className="mt-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 text-sm"
                >
                  Save Tag
                </button>
              </div>
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Carousel Modal */}
      {isCarouselOpen && filteredPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-5xl">
            <Slider {...sliderSettings}>
              {filteredPhotos.map(photo => (
                <div key={photo.id} className="p-4">
                  <img
                    src={photo.url}
                    alt={photo.tag || 'Photo'}
                    className="w-full h-[768px] md:h-[1000px] object-contain rounded-lg"
                  />
                  <div className="text-center mt-2">
                    <input
                      type="text"
                      value={editingTags[photo.id] ?? photo.tag ?? ''}
                      onChange={e => setEditingTags({ ...editingTags, [photo.id]: e.target.value })}
                      placeholder="Enter tag"
                      className="border border-gray-300 p-1 rounded w-full text-center text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => updatePhotoTag(photo.id, editingTags[photo.id] ?? photo.tag ?? '')}
                      className="mt-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Save Tag
                    </button>
                  </div>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg mt-4 block mx-auto hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </Slider>
            <button
              onClick={() => setIsCarouselOpen(false)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg mt-6 block mx-auto hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        .photo-day .fc-daygrid-day-number {
          position: relative;
        }
        .photo-day .fc-daygrid-day-number::after {
          content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" viewBox="0 0 24 24"><path d="M21 3h-3V2a1 1 0 0 0-2 0v1h-4V2a1 1 0 0 0-2 0v1H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8h12v9zm-4-5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>');
          position: absolute;
          top: -8px;
          right: -8px;
        }
        .slick-slide img {
          max-height: 1000px;
          margin: 0 auto;
        }
        .slick-slider {
          max-height: 1200px;
        }
      `}</style>
    </div>
  );
}







function SpendingTracker({ spending, db, user, setSpending, gapiLoaded }) {
  const [newSpending, setNewSpending] = useState({
    date: '',
    item: '',
    quote: '',
    invoiced: '',
    paid: '',
    used: false,
    owed: '', // Will be calculated
  });
  const [editedItems, setEditedItems] = useState({});
  const [error, setError] = useState('');

  // Calculate owed dynamically
  const calculateOwed = (invoiced, paid) => {
    const inv = parseFloat(invoiced) || 0;
    const pay = parseFloat(paid) || 0;
    return (inv - pay).toFixed(2);
  };

  const totalQuote = spending.reduce((sum, item) => sum + (parseFloat(item.quote) || 0), 0);
  const totalInvoiced = spending.reduce((sum, item) => sum + (parseFloat(item.invoiced) || 0), 0);
  const totalPaid = spending.reduce((sum, item) => sum + (parseFloat(item.paid) || 0), 0);
  const totalOwed = spending.reduce((sum, item) => sum + (parseFloat(item.owed) || 0), 0);

  const validateInputs = (item) => {
    if (!item.item) return 'Item is required';
    if (!item.date) return 'Date is required';
    if (item.quote && isNaN(parseFloat(item.quote))) return 'Quote must be a number';
    if (item.invoiced && isNaN(parseFloat(item.invoiced))) return 'Invoiced amount must be a number';
    if (item.paid && isNaN(parseFloat(item.paid))) return 'Paid amount must be a number';
    if (item.invoiced && !/^\d+(\.\d{1,2})?$/.test(item.invoiced)) return 'Invoiced amount must have up to 2 decimal places';
    if (item.paid && !/^\d+(\.\d{1,2})?$/.test(item.paid)) return 'Paid amount must have up to 2 decimal places';
    return '';
  };

  const handleFileUpload = async (event, id) => {
    if (!gapiLoaded) {
      setError('Google API not loaded. Please try again after signing in.');
      return;
    }

    const file = event.target.files[0];
    if (file) {
      const metadata = {
        name: file.name,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      try {
        const accessToken = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ 'Authorization': `Bearer ${accessToken}` }),
          body: formData,
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const fileUrl = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
        if (id) {
          const updatedItem = { ...spending.find(item => item.id === id), link: fileUrl };
          setEditedItems({ ...editedItems, [id]: updatedItem });
          await updateDoc(doc(db, 'spending', id), { link: fileUrl });
          setSpending(prevSpending => prevSpending.map(item => item.id === id ? { ...item, link: fileUrl } : item));
        } else {
          setNewSpending({ ...newSpending, link: fileUrl });
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setError('Failed to upload file to Google Drive: ' + error.message);
      }
    }
  };

  const addSpending = async () => {
    const validationError = validateInputs(newSpending);
    if (validationError) {
      setError(validationError);
      return;
    }
    const owed = calculateOwed(newSpending.invoiced, newSpending.paid);
    await addDoc(collection(db, 'spending'), {
      date: newSpending.date, // Stored as input value (e.g., "2025-10-02")
      item: newSpending.item,
      quote: parseFloat(newSpending.quote) || 0,
      invoiced: parseFloat(newSpending.invoiced) || 0,
      paid: parseFloat(newSpending.paid) || 0,
      used: newSpending.used,
      owed: owed,
      createdBy: user.email,
      createdAt: new Date().toISOString()
    });
    setNewSpending({
      date: '',
      item: '',
      quote: '',
      invoiced: '',
      paid: '',
      used: false,
      owed: '',
    });
    setError('');
  };

  const editSpending = async (id) => {
    const editedItem = editedItems[id] || spending.find(item => item.id === id);
    const validationError = validateInputs(editedItem);
    if (validationError) {
      setError(validationError);
      return;
    }
    const owed = calculateOwed(editedItem.invoiced, editedItem.paid);
    await updateDoc(doc(db, 'spending', id), {
      date: editedItem.date, // Stored as input value
      item: editedItem.item,
      quote: parseFloat(editedItem.quote) || 0,
      invoiced: parseFloat(editedItem.invoiced) || 0,
      paid: parseFloat(editedItem.paid) || 0,
      used: editedItem.used,
      owed: owed
    });
    const updatedItem = { ...editedItem, owed, id };
    setSpending(prevSpending => prevSpending.map(item => item.id === id ? updatedItem : item));
    setEditedItems(prev => {
      const newEdited = { ...prev };
      delete newEdited[id];
      return newEdited;
    });
    setError('');
  };

  const deleteSpending = async (id) => {
    if (window.confirm('Are you sure you want to delete this spending entry?')) {
      try {
        await deleteDoc(doc(db, 'spending', id));
        setSpending(prevSpending => prevSpending.filter(item => item.id !== id));
        console.log(`Deleted spending entry with ID: ${id}`);
      } catch (error) {
        console.error('Delete failed:', error);
        setError('Failed to delete entry: ' + error.message);
      }
    }
  };

  const handleInputChange = (id, field, value) => {
    const updatedItem = { ...spending.find(item => item.id === id), [field]: value };
    if (field === 'invoiced' || field === 'paid') {
      updatedItem.owed = calculateOwed(updatedItem.invoiced, updatedItem.paid);
    }
    setEditedItems({ ...editedItems, [id]: updatedItem });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Spending Tracker</h2>
      <div className="mb-4">
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <table className="table table-striped table-hover w-full" style={{ fontFamily: 'monospace' }}>
          <thead className="table-dark">
            <tr>
              <th style={{ width: '120px', textAlign: 'center' }}>Date</th>
              <th style={{ width: '280px', textAlign: 'center' }}>Item</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Quote</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Upload</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Invoiced</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Paid</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Used?</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Owed</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">
                <input
                  type="date"
                  value={newSpending.date}
                  onChange={(e) => setNewSpending({ ...newSpending, date: e.target.value })}
                  className="form-control border p-1 rounded w-full text-center"
                />
              </td>
              <td className="text-center">
                <input
                  type="text"
                  placeholder="Item (e.g., Doors)"
                  value={newSpending.item}
                  onChange={(e) => setNewSpending({ ...newSpending, item: e.target.value })}
                  className="form-control border p-1 rounded w-full text-center"
                />
              </td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSpending.quote}
                    onChange={(e) => setNewSpending({ ...newSpending, quote: e.target.value })}
                    className="form-control money-input border p-1 rounded w-full text-center"
                  />
                </div>
              </td>
              <td className="text-center">
                {!newSpending.link ? (
                  <label className="btn btn-primary w-full py-1">
                    <i className="fas fa-upload"></i> Upload
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <a
                    href={newSpending.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline w-full block text-center"
                  >
                    View File
                  </a>
                )}
              </td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSpending.invoiced}
                    onChange={(e) => {
                      const invoiced = e.target.value;
                      const owed = calculateOwed(invoiced, newSpending.paid);
                      setNewSpending({ ...newSpending, invoiced, owed });
                    }}
                    className="form-control money-input border p-1 rounded w-full text-center"
                  />
                </div>
              </td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSpending.paid}
                    onChange={(e) => {
                      const paid = e.target.value;
                      const owed = calculateOwed(newSpending.invoiced, paid);
                      setNewSpending({ ...newSpending, paid, owed });
                    }}
                    className="form-control money-input border p-1 rounded w-full text-center"
                  />
                </div>
              </td>
              <td className="text-center">
                <input
                  type="checkbox"
                  checked={newSpending.used}
                  onChange={(e) => setNewSpending({ ...newSpending, used: e.target.checked })}
                  className="form-check-input"
                />
              </td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <span className="money-value">{newSpending.owed || '0.00'}</span>
                </div>
              </td>
              <td className="text-center">
                <button
                  onClick={addSpending}
                  className="btn btn-primary w-full py-1"
                  disabled={!newSpending.item || !newSpending.date}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </td>
            </tr>
            {spending.map((item) => {
              const isEditing = !!editedItems[item.id];
              const editedItem = isEditing ? editedItems[item.id] : item;

              const handleInputChange = (field, value) => {
                const updatedItem = { ...editedItem, [field]: value };
                if (field === 'invoiced' || field === 'paid') {
                  updatedItem.owed = calculateOwed(updatedItem.invoiced, updatedItem.paid);
                }
                setEditedItems({ ...editedItems, [item.id]: updatedItem });
              };

              return (
                <tr key={item.id}>
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedItem.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="form-control border p-1 rounded w-full text-center"
                      />
                    ) : (
                      item.date // Display raw date from DB to avoid offset
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedItem.item}
                        onChange={(e) => handleInputChange('item', e.target.value)}
                        className="form-control border p-1 rounded w-full text-center"
                      />
                    ) : (
                      item.item
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedItem.quote}
                          onChange={(e) => handleInputChange('quote', e.target.value)}
                          className="form-control money-input border p-1 rounded w-full text-center"
                        />
                      </div>
                    ) : (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <span className="money-value">{parseFloat(item.quote || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      !editedItem.link ? (
                        <label className="btn btn-primary w-full py-1">
                          <i className="fas fa-upload"></i> Upload
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, item.id)}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <a
                          href={editedItem.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline w-full block text-center"
                        >
                          View File
                        </a>
                      )
                    ) : (
                      item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline w-full block text-center"
                        >
                          View File
                        </a>
                      ) : (
                        <label className="btn btn-primary w-full py-1">
                          <i className="fas fa-upload"></i> Upload
                          <input
                            type="file"
                            onChange={(e) => handleFileUpload(e, item.id)}
                            className="hidden"
                          />
                        </label>
                      )
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedItem.invoiced}
                          onChange={(e) => handleInputChange('invoiced', e.target.value)}
                          className="form-control money-input border p-1 rounded w-full text-center"
                        />
                      </div>
                    ) : (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <span className="money-value">{parseFloat(item.invoiced || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedItem.paid}
                          onChange={(e) => handleInputChange('paid', e.target.value)}
                          className="form-control money-input border p-1 rounded w-full text-center"
                        />
                      </div>
                    ) : (
                      <div className="money-cell flex items-center justify-center">
                        <span className="money-symbol">$</span>
                        <span className="money-value">{parseFloat(item.paid || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={editedItem.used}
                        onChange={(e) => handleInputChange('used', e.target.checked)}
                        className="form-check-input"
                      />
                    ) : (
                      item.used ? <i className="fas fa-check text-success"></i> : ''
                    )}
                  </td>
                  <td className="text-center">
                    <div className="money-cell flex items-center justify-center">
                      <span className="money-symbol">$</span>
                      <span className="money-value">{parseFloat(editedItem.owed || item.owed || 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    {isEditing ? (
                      <button
                        onClick={() => editSpending(item.id)}
                        className="btn btn-success w-full py-1"
                      >
                        Save
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditedItems({ ...editedItems, [item.id]: item })}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <i className="fas fa-edit fa-sm" aria-label="Edit"></i>
                        </button>
                        <button
                          onClick={() => deleteSpending(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <i className="fas fa-trash fa-sm" aria-label="Delete"></i>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="table-secondary">
              <td colSpan="2" className="text-center"><strong>Totals</strong></td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <span className="money-value">{totalQuote.toFixed(2)}</span>
                </div>
              </td>
              <td></td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <span className="money-value">{totalInvoiced.toFixed(2)}</span>
                </div>
              </td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <span className="money-value">{totalPaid.toFixed(2)}</span>
                </div>
              </td>
              <td></td>
              <td className="text-center">
                <div className="money-cell flex items-center justify-center">
                  <span className="money-symbol">$</span>
                  <span className="money-value">{totalOwed.toFixed(2)}</span>
                </div>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemsUnderConsideration({ items, db, user }) {
  const [newItem, setNewItem] = useState({ room: '', product: '', brand: '', collection: '', model: '', link: '' });
  const [sortBy, setSortBy] = useState('createdAt');

  const addItem = async () => {
    if (newItem.model) {
      await addDoc(collection(db, 'items'), {
        ...newItem,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      });
      setNewItem({ room: '', product: '', brand: '', collection: '', model: '', link: '' });
    }
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, 'items', id));
  };

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'createdAt') {
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    }
    return a[sortBy]?.localeCompare(b[sortBy]) || 0;
  });

  // Extract unique values for datalists
  const uniqueRooms = [...new Set(items.map(item => item.room).filter(Boolean))];
  const uniqueProducts = [...new Set(items.map(item => item.product).filter(Boolean))];
  const uniqueBrands = [...new Set(items.map(item => item.brand).filter(Boolean))];
  const uniqueCollections = [...new Set(items.map(item => item.collection).filter(Boolean))];
  const uniqueModels = [...new Set(items.map(item => item.model).filter(Boolean))];

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Items Under Consideration</h2>
      <div className="mb-4">
        <select
          onChange={(e) => setSortBy(e.target.value)}
          className="border p-2 mb-2 rounded"
          value={sortBy}
        >
          <option value="room">Room</option>
          <option value="product">Product</option>
          <option value="brand">Brand</option>
          <option value="collection">Collection</option>
          <option value="model">Model #</option>
          <option value="createdAt">Date Added</option>
        </select>
      </div>
      <table className="table table-striped table-hover w-full" style={{ fontFamily: 'monospace' }}>
        <thead className="table-dark">
          <tr>
            <th style={{ width: '12%', textAlign: 'center' }}>Room</th>
            <th style={{ width: '12%', textAlign: 'center' }}>Product</th>
            <th style={{ width: '12%', textAlign: 'center' }}>Brand</th>
            <th style={{ width: '12%', textAlign: 'center' }}>Collection</th>
            <th style={{ width: '12%', textAlign: 'center' }}>Model #</th>
            <th style={{ width: '25%', textAlign: 'center' }}>Link</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Date Added</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Input row for adding new item */}
          <tr>
            <td className="text-center">
              <input
                list="roomOptions"
                value={newItem.room}
                onChange={(e) => setNewItem({ ...newItem, room: e.target.value })}
                placeholder="Type or select"
                className="border p-1 rounded w-full text-center"
              />
              <datalist id="roomOptions">
                {uniqueRooms.map((room, index) => (
                  <option key={index} value={room} />
                ))}
              </datalist>
            </td>
            <td className="text-center">
              <input
                list="productOptions"
                value={newItem.product}
                onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
                placeholder="Type or select"
                className="border p-1 rounded w-full text-center"
              />
              <datalist id="productOptions">
                {uniqueProducts.map((product, index) => (
                  <option key={index} value={product} />
                ))}
              </datalist>
            </td>
            <td className="text-center">
              <input
                list="brandOptions"
                value={newItem.brand}
                onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                placeholder="Type or select"
                className="border p-1 rounded w-full text-center"
              />
              <datalist id="brandOptions">
                {uniqueBrands.map((brand, index) => (
                  <option key={index} value={brand} />
                ))}
              </datalist>
            </td>
            <td className="text-center">
              <input
                list="collectionOptions"
                value={newItem.collection}
                onChange={(e) => setNewItem({ ...newItem, collection: e.target.value })}
                placeholder="Type or select"
                className="border p-1 rounded w-full text-center"
              />
              <datalist id="collectionOptions">
                {uniqueCollections.map((collection, index) => (
                  <option key={index} value={collection} />
                ))}
              </datalist>
            </td>
            <td className="text-center">
              <input
                list="modelOptions"
                value={newItem.model}
                onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                placeholder="Type or select"
                className="border p-1 rounded w-full text-center"
              />
              <datalist id="modelOptions">
                {uniqueModels.map((model, index) => (
                  <option key={index} value={model} />
                ))}
              </datalist>
            </td>
            <td className="text-center">
              <input
                type="url"
                value={newItem.link}
                onChange={(e) => setNewItem({ ...newItem, link: e.target.value })}
                placeholder="Link (e.g., product page)"
                className="border p-1 rounded w-full text-center"
              />
            </td>
            <td className="text-center">-</td>
            <td className="text-center">
              <button
                onClick={addItem}
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                disabled={!newItem.model}
              >
                Add
              </button>
            </td>
          </tr>
          {/* Existing items */}
          {sortedItems.map((item) => (
            <tr key={item.id}>
              <td className="text-center">{item.room}</td>
              <td className="text-center">{item.product}</td>
              <td className="text-center">{item.brand}</td>
              <td className="text-center">{item.collection}</td>
              <td className="text-center">{item.model}</td>
              <td className="text-center">
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    View Link
                  </a>
                ) : (
                  '-'
                )}
              </td>
              <td className="text-center">
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: '2-digit',
                })}
              </td>
              <td className="text-center">
                <button
                  onClick={() => deleteItem(item.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoogleDriveSection({ googleDriveFolder }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Google Drive Invoices</h2>
      <p className="mb-2">View and upload invoices to the shared folder:</p>
      <a 
        href={`https://drive.google.com/drive/folders/${googleDriveFolder}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-500 underline"
      >
        Open Google Drive Folder
      </a>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <strong>Instructions:</strong> Click the link above to open the folder. Upload files directly to Google Drive, then copy the shareable link for any invoice and paste it into the <strong>Spending Tracker</strong> section above.
        </p>
      </div>
    </div>
  );
}

function PinterestSection({ pins }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Pinterest Board</h2>
      <div className="grid grid-cols-3 gap-2">
        {pins.map(pin => (
          <a key={pin.id} href={pin.url} target="_blank" rel="noopener noreferrer" className="block">
            <img src={pin.image} alt={pin.title} className="w-full h-32 object-cover rounded" />
            <p className="text-sm mt-1">{pin.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
export default App;