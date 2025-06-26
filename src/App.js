import React from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- Helper Functions & Initial Config ---

// YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDlNPxvFkNeHAlAaYs02o8ryt8zCqSeB-g",
  authDomain: "trello-flashcards-app.firebaseapp.com",
  projectId: "trello-flashcards-app",
  storageBucket: "trello-flashcards-app.firebasestorage.app",
  messagingSenderId: "768646110108",
  appId: "1:768646110108:web:08c05cef8eae4d9f2d4659",
  measurementId: "G-7L146V8XMS"
};

// 本地存储键名定义
const LOCAL_STORAGE_KEY = 'trello-flashcards-data';
const STORAGE_TYPE_KEY = 'trello-flashcards-storage-type';
const defaultStorageType = 'local'; // 默认使用本地存储

// Custom unique ID generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// The names for the 12 lists, in order
const LIST_NAMES = ['Inbox', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'Archive'];

// Generate a default new board structure
const createNewBoardStructure = (name, cards = []) => ({
    id: generateId(),
    name: name,
    lists: LIST_NAMES.map(listName => ({
        id: generateId(),
        title: listName,
        cards: listName === 'Inbox' ? cards : [],
    })),
});

// --- React Components ---

const NewBoardModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = React.useState('');
    const [pastedText, setPastedText] = React.useState('');

    if (!isOpen) return null;

    const handleCreate = () => {
        if (!name.trim() || !pastedText.trim()) {
            alert('看板名称和单词内容不能为空！');
            return;
        }
        
        const cards = pastedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const parts = line.split('\t'); 
                if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                    return { id: generateId(), word: parts[0].trim(), definition: parts.slice(1).join(' ').trim() };
                }
                const spaceParts = line.split(/ (.*)/s);
                if (spaceParts.length >= 2 && spaceParts[0].trim() && spaceParts[1].trim()) {
                    return { id: generateId(), word: spaceParts[0].trim(), definition: spaceParts[1].trim() };
                }
                return null;
            })
            .filter(Boolean);

        onCreate(name, cards);
        onClose();
        setName('');
        setPastedText('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg text-gray-200">
                <h2 className="text-2xl font-bold mb-4">创建新看板</h2>
                <p className="mb-4 text-sm text-gray-400">在Excel或表格中复制两列（单词、释义），然后粘贴到下方。</p>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入看板名称" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="在此粘贴单词列表..." className="w-full h-48 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">取消</button>
                    <button onClick={handleCreate} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold transition-colors">创建</button>
                </div>
            </div>
        </div>
    );
};

const DefinitionTooltip = ({ definition }) => (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 shadow-2xl rounded-lg p-4 w-full max-w-sm h-24 text-gray-300 z-30 flex items-center justify-center">
        <p className="text-center">{definition || '选中一张卡片以查看释义'}</p>
    </div>
);

const Card = ({ card, isSelected, isArchived, listId, handleDragStart }) => {
    const [isExpanded, setIsExpanded] = React.useState(!isArchived);

    const onDragStart = (e) => {
        if (!isArchived) {
           e.dataTransfer.setData('cardInfo', JSON.stringify({ cardId: card.id, sourceListId: listId }));
        } else {
           e.preventDefault();
        }
    };

    // 确保这些类在生产环境中不会被优化掉
    const ringClasses = "ring-2 ring-blue-500";
    
    if (isArchived) {
        return (
            <div draggable="true" onDragStart={onDragStart} onClick={() => setIsExpanded(!isExpanded)} className={`p-2 rounded-md bg-gray-600 text-sm cursor-pointer ${isSelected ? ringClasses : ''}`}>
                {isExpanded ? (
                    <><p className="font-semibold">{card.word}</p><p className="text-xs text-gray-400 mt-1">{card.definition}</p></>
                ) : (
                    <p className="font-semibold truncate">{card.word}</p>
                )}
            </div>
        )
    }

    return (
        <div draggable="true" onDragStart={onDragStart} className={`p-3 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors cursor-grab ${isSelected ? ringClasses : ''}`}>
            <p className="font-semibold text-base text-gray-100">{card.word}</p>
        </div>
    );
};

const List = ({ list, onCardClick, selectedCardId, isArchive, handleDragStart, handleDrop, dragOverList, setDragOverList }) => {
    return (
        <div 
            className={`bg-gray-800 rounded-lg p-2 w-64 h-full flex flex-col flex-shrink-0 transition-colors ${dragOverList === list.id ? 'bg-gray-900' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverList(list.id); }}
            onDragLeave={() => setDragOverList(null)}
            onDrop={(e) => { e.preventDefault(); handleDrop(e, list.id); setDragOverList(null); }}
        >
            <h3 className="font-bold text-center text-gray-300 p-2 cursor-pointer">{list.title}</h3>
            <div className={`flex-grow min-h-[100px] space-y-2 p-1 rounded-md`}>
                {list.cards.map((card) => (
                    <div key={card.id} onClick={() => onCardClick(card.id, list.id)}>
                         <Card card={card} isSelected={card.id === selectedCardId} isArchived={isArchive} listId={list.id} handleDragStart={handleDragStart} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm text-gray-200">
                <p className="mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">取消</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 font-semibold transition-colors">确认</button>
                </div>
            </div>
        </div>
    );
};

const DailyGoalProgressBar = ({ progress, goal, onGoalChange }) => (
    <div className="w-full bg-gray-800 p-3 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-2 text-sm">
            <span className="font-semibold text-gray-300">每日目标</span>
            <div className="flex items-center space-x-2">
                 <span className="text-gray-400">{progress} /</span>
                 <input type="number" value={goal} onChange={(e) => onGoalChange(Number(e.target.value) || 0)} className="w-20 bg-gray-700 text-white rounded p-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" step="50" />
                 <span className="text-gray-400">次移动</span>
            </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
            <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${Math.min((progress / (goal || 1)) * 100, 100)}%` }}></div>
        </div>
    </div>
);

const ListProgressBar = ({ activeList, initialCount }) => {
    if (!activeList) return <div className="h-[68px]"></div>;
    
    const currentCount = activeList.cards.length;
    const clearedCount = Math.max(0, initialCount - currentCount);
    const progress = initialCount > 0 ? (clearedCount / initialCount) * 100 : 0;

    return (
        <div className="w-full bg-gray-800 p-3 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2 text-sm">
                <span className="font-semibold text-gray-300">清单进度: <span className="text-blue-400">{activeList.title}</span></span>
                <span className="text-gray-400">{clearedCount} / {initialCount}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

const App = () => {
    const [boards, setBoards] = React.useState([]);
    const [activeBoardId, setActiveBoardId] = React.useState(null);
    const [selectedCardId, setSelectedCardId] = React.useState(null);
    const [selectedListId, setSelectedListId] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [confirmation, setConfirmation] = React.useState({ isOpen: false, message: '', onConfirm: () => {} });
    const [dragOverList, setDragOverList] = React.useState(null);
    const [dailyGoal, setDailyGoal] = React.useState(500);
    const [dailyProgress, setDailyProgress] = React.useState({ count: 0, date: getTodayDateString() });
    const [activeListForProgress, setActiveListForProgress] = React.useState(null);
    const [db, setDb] = React.useState(null);
    const [isReady, setIsReady] = React.useState(false);
    const [storageType, setStorageType] = React.useState(() => {
        // 在组件初始化时读取存储类型
        return localStorage.getItem(STORAGE_TYPE_KEY) || defaultStorageType;
    });
    
    // 从本地存储加载数据
    const loadFromLocalStorage = React.useCallback(() => {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                return parsedData;
            }
        } catch (e) {
            console.error("Failed to load from local storage", e);
        }
        return null;
    }, []);

    // 保存数据到本地存储
    const saveToLocalStorage = React.useCallback((data) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("Failed to save to local storage", e);
            return false;
        }
    }, []);
    
    // 初始化Firebase
    React.useEffect(() => {
        localStorage.setItem(STORAGE_TYPE_KEY, storageType);
        
        if (storageType === 'firebase') {
            try {
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                setDb(firestore);
                const auth = getAuth(app);
                signInAnonymously(auth).catch(error => {
                    console.error("Anonymous sign-in failed:", error);
                    setStorageType('local');
                });
            } catch (error) {
                console.error("Firebase initialization error:", error);
                setStorageType('local');
            }
        } else {
            setDb(null);
        }
    }, [storageType]);

    // 处理数据加载
    const loadData = (data) => {
        if (!data) {
            // 创建默认数据
            const defaultBoard = createNewBoardStructure('我的第一个看板', [
                {id: generateId(), word: 'Welcome', definition: '欢迎使用!'},
                {id: generateId(), word: '你好', definition: 'Hello'},
            ]);
            setBoards([defaultBoard]);
            setActiveBoardId(defaultBoard.id);
            setDailyGoal(500);
            setDailyProgress({ count: 0, date: getTodayDateString() });
            return;
        }

        // 设置看板数据
        setBoards(data.boards || []);
        setDailyGoal(data.dailyGoal || 500);
        
        // 设置日进度数据
        const today = getTodayDateString();
        if (data.dailyProgress && data.dailyProgress.date === today) {
            setDailyProgress(data.dailyProgress);
        } else {
            setDailyProgress({ count: 0, date: today });
        }
        
        // 设置激活的看板
        let newActiveBoardId = data.activeBoardId;
        if (!newActiveBoardId || !data.boards?.some(b => b.id === newActiveBoardId)) {
            newActiveBoardId = data.boards && data.boards.length > 0 ? data.boards[0].id : null;
        }
        setActiveBoardId(newActiveBoardId);
    }

    // 初始化数据加载
    React.useEffect(() => {
        // 先从本地存储加载数据
        const localData = loadFromLocalStorage();
        
        // 如果是本地存储模式或无法使用Firebase
        if (storageType === 'local' || !db) {
            loadData(localData);
            setIsReady(true);
            return;
        }

        // Firebase模式：从Firebase加载数据
        const docRef = doc(db, 'public-boards', 'shared-board-data');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const firebaseData = docSnap.data();
                loadData(firebaseData);
                
                // 同时更新本地存储
                saveToLocalStorage(firebaseData);
            } else {
                // Firebase中没有数据，使用本地数据或创建默认数据
                if (localData) {
                    loadData(localData);
                    // 将本地数据同步到Firebase
                    setDoc(docRef, localData, { merge: true })
                        .catch(e => console.error("Error initializing Firebase with local data:", e));
                } else {
                    loadData(null); // 创建默认数据
                }
            }
            setIsReady(true);
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            loadData(localData); // 发生错误时使用本地数据
            setStorageType('local');
            setIsReady(true);
        });

        return () => unsubscribe();
    }, [db, storageType, loadFromLocalStorage, saveToLocalStorage]);

    // 数据保存逻辑
    React.useEffect(() => {
        if (!isReady) return;
        
        // 准备要保存的数据
        const dataToSave = { 
            boards, 
            activeBoardId, 
            dailyGoal, 
            dailyProgress,
            lastUpdated: new Date().toISOString() // 添加时间戳
        };

        // 无论使用哪种存储方式，始终保存到本地
        saveToLocalStorage(dataToSave);

        // 如果使用Firebase，同时保存到云端
        if (storageType === 'firebase' && db) {
            const docRef = doc(db, 'public-boards', 'shared-board-data');
            setDoc(docRef, dataToSave, { merge: true })
                .catch(e => console.error("Error saving data to Firebase:", e));
        }
    }, [boards, activeBoardId, dailyGoal, dailyProgress, isReady, db, storageType, saveToLocalStorage]);

    const incrementProgress = () => {
        setDailyProgress(prev => {
            const today = getTodayDateString();
            if (prev.date !== today) return { count: 1, date: today };
            return { ...prev, count: prev.count + 1 };
        });
    };

    const handleBoardChange = (boardId) => {
        setActiveBoardId(boardId);
        setSelectedCardId(null);
        setSelectedListId(null);
        setActiveListForProgress(null);
    };

    const handleCreateBoard = (name, cards) => {
        // 创建新看板
        const newBoard = createNewBoardStructure(name, cards);
        const newBoards = [...boards, newBoard];
        setBoards(newBoards);
        setActiveBoardId(newBoard.id);
        
        // 确保保存到本地
        const dataToSave = { 
            boards: newBoards, 
            activeBoardId: newBoard.id,
            dailyGoal, 
            dailyProgress,
            lastUpdated: new Date().toISOString()
        };
        saveToLocalStorage(dataToSave);
    };
    
    const handleDeleteBoard = (boardId) => {
        setConfirmation({
            isOpen: true,
            message: '确定要删除这个看板吗？所有卡片将一并删除。',
            onConfirm: () => {
                const newBoards = boards.filter(b => b.id !== boardId);
                setBoards(newBoards);
                if (activeBoardId === boardId) {
                    setActiveBoardId(newBoards.length > 0 ? newBoards[0].id : null);
                }
                setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
            }
        });
    };
    
    const handleRenameBoard = (boardId, oldName) => {
        const newName = prompt('输入新的看板名称:', oldName);
        if (newName && newName.trim() !== '') {
            setBoards(boards.map(b => b.id === boardId ? { ...b, name: newName.trim() } : b));
        }
    };

    const handleDragStart = (e, cardId, sourceListId) => {
        e.dataTransfer.setData('cardInfo', JSON.stringify({ cardId, sourceListId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e, targetListId) => {
        const cardInfo = e.dataTransfer.getData('cardInfo');
        if (!cardInfo) return;

        const { cardId, sourceListId } = JSON.parse(cardInfo);
        if (sourceListId === targetListId) return;

        setBoards(prevBoards => {
            const newBoards = JSON.parse(JSON.stringify(prevBoards)); 
            const board = newBoards.find(b => b.id === activeBoardId);
            if (!board) return prevBoards;

            const sourceList = board.lists.find(l => l.id === sourceListId);
            const cardIndex = sourceList.cards.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return prevBoards;

            const [movedCard] = sourceList.cards.splice(cardIndex, 1);
            const destList = board.lists.find(l => l.id === targetListId);
            destList.cards.unshift(movedCard);

            incrementProgress();
            return newBoards;
        });
    };

    const handleCardClick = (cardId, listId) => {
        setSelectedCardId(cardId);
        setSelectedListId(listId);
    };
    
    const handleListTitleClick = (listId) => {
        const board = boards.find(b => b.id === activeBoardId);
        const list = board?.lists.find(l => l.id === listId);
        if (list) {
            setActiveListForProgress({ listId: list.id, initialCount: list.cards.length });
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (!selectedCardId || !selectedListId) return;
            if (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea') return;

            setBoards(prevBoards => {
                const newBoards = JSON.parse(JSON.stringify(prevBoards));
                const board = newBoards.find(b => b.id === activeBoardId);
                if (!board) return prevBoards;

                const currentListIndex = board.lists.findIndex(l => l.id === selectedListId);
                if (currentListIndex === -1) return prevBoards;
                
                let targetListIndex = -1;
            
                if (board.lists[currentListIndex].title === 'Inbox') {
                    if (event.key === 'ArrowLeft') targetListIndex = 1; // '10'
                    else if (event.key === 'ArrowRight') targetListIndex = 2; // '9'
                } else {
                    if (event.key === 'ArrowLeft') targetListIndex = currentListIndex - 1; 
                    else if (event.key === 'ArrowRight') targetListIndex = currentListIndex + 1; 
                }

                if (targetListIndex === -1 || targetListIndex < 0 || targetListIndex >= board.lists.length) {
                    return prevBoards;
                }

                event.preventDefault();

                const sourceList = board.lists[currentListIndex];
                const destList = board.lists[targetListIndex];
                const cardIndex = sourceList.cards.findIndex(c => c.id === selectedCardId);

                if (cardIndex > -1) {
                    const [movedCard] = sourceList.cards.splice(cardIndex, 1);
                    destList.cards.unshift(movedCard);

                    let nextSelectedCardId = sourceList.cards.length > 0 
                        ? sourceList.cards[Math.min(cardIndex, sourceList.cards.length - 1)].id 
                        : null;
                    
                    setSelectedCardId(nextSelectedCardId);
                    if(!nextSelectedCardId) setSelectedListId(null);
                    
                    incrementProgress();
                    return newBoards;
                }
                return prevBoards;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCardId, selectedListId, activeBoardId]);

    const activeBoard = boards.find(b => b.id === activeBoardId);
    const selectedCard = activeBoard?.lists.flatMap(l => l.cards).find(c => c.id === selectedCardId);
    const activeListForProgressBar = activeBoard?.lists.find(l => l.id === activeListForProgress?.listId);

    // 切换存储类型的函数
    const toggleStorageType = () => {
        const newType = storageType === 'local' ? 'firebase' : 'local';
        setStorageType(newType);
        // 确保存储类型保存到localStorage
        localStorage.setItem(STORAGE_TYPE_KEY, newType);
    };

    if (!isReady) {
        return <div className="bg-gray-900 text-white h-screen flex items-center justify-center">
            正在加载数据...
        </div>;
    }

    return (
        <div className="bg-gray-900 text-white h-screen flex flex-col font-sans">
            <ConfirmationModal isOpen={confirmation.isOpen} message={confirmation.message} onConfirm={confirmation.onConfirm} onCancel={() => setConfirmation({ isOpen: false, message: '', onConfirm: () => {} })}/>
            <NewBoardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateBoard} />

            <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 p-2 flex items-stretch gap-4 z-20">
                <div className="flex-1">
                    <DailyGoalProgressBar progress={dailyProgress.count} goal={dailyGoal} onGoalChange={setDailyGoal} />
                </div>
                 <div className="flex-1">
                    <ListProgressBar activeList={activeListForProgressBar} initialCount={activeListForProgress?.initialCount ?? 0} />
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden">
                <aside className="w-64 bg-gray-800/50 p-4 flex-shrink-0 flex flex-col border-r border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold">我的看板</h1>
                        <button 
                            onClick={toggleStorageType} 
                            className={`text-xs px-2 py-1 rounded ${storageType === 'local' ? 'bg-gray-600' : 'bg-blue-600'}`}
                            title={storageType === 'local' ? '当前使用本地存储' : '当前使用云端存储'}
                        >
                            {storageType === 'local' ? '本地' : '云端'}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {boards.map(board => (
                            <div key={board.id} onClick={() => handleBoardChange(board.id)} className={`group p-2 rounded-md cursor-pointer transition-colors ${activeBoardId === board.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                <span className="font-semibold">{board.name}</span>
                                <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleRenameBoard(board.id, board.name); }} className="text-xs text-gray-400 hover:text-white">重命名</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }} className="text-xs text-red-500 hover:text-red-400">删除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="w-full mt-4 p-2 bg-blue-600 rounded-md hover:bg-blue-500 transition-colors font-semibold">
                        + 创建新看板
                    </button>
                </aside>

                <main className="flex-grow flex flex-col overflow-x-auto">
                    {activeBoard ? (
                        <div className="flex-grow p-4 flex space-x-4">
                            {activeBoard.lists.map(list => (
                                <div key={list.id} onClick={() => handleListTitleClick(list.id)} >
                                    <List list={list} onCardClick={handleCardClick} selectedCardId={selectedCardId} isArchive={list.title === 'Archive'} handleDragStart={handleDragStart} handleDrop={handleDrop} dragOverList={dragOverList} setDragOverList={setDragOverList}/>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <h2 className="text-2xl">没有看板</h2>
                                <p className="mt-2">点击左侧的"创建新看板"开始你的学习之旅吧！</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            
            <DefinitionTooltip definition={selectedCard?.definition} />
        </div>
    );
};

export default App;
