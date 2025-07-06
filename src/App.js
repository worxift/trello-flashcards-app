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

const DefinitionTooltip = ({ definition, selectedCard, onEdit, onDelete }) => (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 shadow-2xl rounded-lg p-6 w-full max-w-sm h-auto min-h-24 text-gray-300 z-30 flex justify-center items-center">
        <p className="text-center text-xl font-medium text-blue-300">{definition || '选中一张卡片以查看释义'}</p>
        
        {/* 低调的按钮区域，定位在右下角，默认半透明 */}
        {selectedCard && (
            <div className="absolute right-2 bottom-2 opacity-30 hover:opacity-90 transition-opacity">
                <div className="flex space-x-1">
                    <button 
                        onClick={() => onEdit(selectedCard)} 
                        className="px-2 py-0.5 bg-gray-700 hover:bg-blue-700 rounded text-xs"
                        title="编辑卡片"
                    >
                        编辑
                    </button>
                    <button 
                        onClick={() => onDelete(selectedCard)} 
                        className="px-2 py-0.5 bg-gray-700 hover:bg-red-700 rounded text-xs"
                        title="删除卡片"
                    >
                        删除
                    </button>
                </div>
            </div>
        )}
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

    if (isArchived) {
        return (
            <div draggable="true" onDragStart={onDragStart} onClick={() => setIsExpanded(!isExpanded)} className={`p-2 rounded-md bg-gray-600 text-sm cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                {isExpanded ? (
                    <><p className="font-semibold">{card.word}</p><p className="text-xs text-gray-400 mt-1">{card.definition}</p></>
                ) : (
                    <p className="font-semibold truncate">{card.word}</p>
                )}
            </div>
        )
    }

    return (
        <div draggable="true" onDragStart={onDragStart} className={`p-3 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors cursor-grab ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
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
            <div className="flex items-center justify-center p-2">
                <h3 className="font-bold text-gray-300 cursor-pointer">{list.title}</h3>
                <span className="ml-2 px-1.5 py-0.5 bg-gray-700 text-xs text-gray-400 rounded">
                    {list.cards.length}
                </span>
            </div>
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
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md text-gray-200">
                <p className="mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">取消</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 font-semibold transition-colors">确认</button>
                </div>
            </div>
        </div>
    );
};

const EditCardModal = ({ isOpen, card, onClose, onSave }) => {
    const [word, setWord] = React.useState('');
    const [definition, setDefinition] = React.useState('');
    
    // 当卡片改变或模态窗口打开时更新状态
    React.useEffect(() => {
        if (card) {
            setWord(card.word || '');
            setDefinition(card.definition || '');
        }
    }, [card, isOpen]);
    
    if (!isOpen || !card) return null;
    
    const handleSave = () => {
        // 验证单词和释义不为空
        if (!word.trim()) {
            alert('单词不能为空！');
            return;
        }
        
        onSave({...card, word: word.trim(), definition: definition.trim()});
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg text-gray-200">
                <h2 className="text-xl font-bold mb-4">编辑卡片</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">单词</label>
                        <input 
                            type="text" 
                            value={word} 
                            onChange={(e) => setWord(e.target.value)} 
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">释义</label>
                        <textarea 
                            value={definition} 
                            onChange={(e) => setDefinition(e.target.value)} 
                            className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">取消</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold transition-colors">保存</button>
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
    const [isEditCardModalOpen, setIsEditCardModalOpen] = React.useState(false);
    const [cardToEdit, setCardToEdit] = React.useState(null);
    
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
            // 创建空看板，等待真正的看板加载
            setBoards([]);
            setActiveBoardId(null);
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

    // This effect handles loading data from local storage.
    // It's separate to avoid re-running the default board creation logic.
    React.useEffect(() => {
        if (isReady || storageType !== 'local') return;

        const data = loadFromLocalStorage();
        if (data) {
            loadData(data);
        } else {
             // Create a default board if no data exists
            const initializeDefaultBoard = async () => {
                try {
                    // 加载牛津3000词
                    const response = await fetch('/牛津3000词.csv');
                    const text = await response.text();
                    console.log(`CSV文件总行数: ${text.split('\n').length}`);
                    let failedLines = 0;
                    const cards = text
                        .split('\n')
                        .map((line, index) => {
                            // 如果行为空，则跳过
                            if (!line.trim()) {
                                console.log(`第${index+1}行为空行`);
                                failedLines++;
                                return null;
                            }
                            
                            const parts = line.split(',');
                            
                            // 只要有单词部分就创建卡片
                            if (parts[0] && parts[0].trim()) {
                                return {
                                    id: generateId(),
                                    word: parts[0].trim(),
                                    definition: parts.slice(1).join(',').trim().replace(/"/g, '')
                                };
                            }
                            
                            console.log(`第${index+1}行解析失败: "${line}"`);
                            failedLines++;
                            return null;
                        })
                        .filter(Boolean);

                    console.log(`成功解析的单词数量: ${cards.length}`);
                    console.log(`解析失败的行数: ${failedLines}`);
                    
                    // 创建牛津3000词看板
                    const defaultBoard = createNewBoardStructure("牛津3000词", cards);
                    
                    try {
                        // 加载HSK3000词
                        const hskCards = await loadHSK3000();
                        // 创建HSK3000词看板
                        const hskBoard = createNewBoardStructure("HSK3000词", hskCards);
                        
                        try {
                            // 加载TOPIK初级词汇
                            const topikCards = await loadTOPIK1560();
                            // 创建TOPIK1560词看板
                            const topikBoard = createNewBoardStructure("TOPIK1560词", topikCards);
                            
                            // 设置三个看板
                            setBoards([defaultBoard, hskBoard, topikBoard]);
                            setActiveBoardId(defaultBoard.id);
                        } catch (topikError) {
                            console.error("Failed to load TOPIK word list:", topikError);
                            // 如果TOPIK加载失败，只使用牛津和HSK词汇
                            setBoards([defaultBoard, hskBoard]);
                            setActiveBoardId(defaultBoard.id);
                        }
                    } catch (hskError) {
                        console.error("Failed to load HSK word list:", hskError);
                        // 如果HSK加载失败，只使用牛津词汇
                        setBoards([defaultBoard]);
                        setActiveBoardId(defaultBoard.id);
                    }
                } catch (error) {
                    console.error("Failed to load default word list:", error);
                    const emptyBoard = createNewBoardStructure("我的看板");
                    setBoards([emptyBoard]);
                    setActiveBoardId(emptyBoard.id);
                } finally {
                    setIsReady(true);
                }
            };
            initializeDefaultBoard();
        }
    }, [isReady, storageType, loadFromLocalStorage, loadData]);

    // 数据加载和初始化
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
                // Firebase中没有数据，使用本地数据或将空数据保存
                if (localData) {
                    loadData(localData);
                    // 将本地数据同步到Firebase
                    setDoc(docRef, localData, { merge: true })
                        .catch(e => console.error("Error initializing Firebase with local data:", e));
                } else {
                    // 设置空数据，后续会通过另一个useEffect加载标准看板
                    loadData(null);
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
    
    // 添加一个一次性增加多个进度的函数
    const incrementProgressByAmount = (amount) => {
        if (amount <= 0) return;
        
        setDailyProgress(prev => {
            const today = getTodayDateString();
            if (prev.date !== today) return { count: amount, date: today };
            return { ...prev, count: prev.count + amount };
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

            // 处理上下方向键 - 在同一列表内切换卡片
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                
                const board = boards.find(b => b.id === activeBoardId);
                if (!board) return;
                
                const currentList = board.lists.find(l => l.id === selectedListId);
                if (!currentList) return;
                
                const cards = currentList.cards;
                if (cards.length <= 1) return; // 只有一张卡片时无法切换
                
                const currentCardIndex = cards.findIndex(c => c.id === selectedCardId);
                if (currentCardIndex === -1) return;
                
                let newCardIndex;
                if (event.key === 'ArrowUp') {
                    // 向上导航到前一张卡片，如果已经是第一张则循环到最后一张
                    newCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
                } else {
                    // 向下导航到后一张卡片，如果已经是最后一张则循环到第一张
                    newCardIndex = (currentCardIndex + 1) % cards.length;
                }
                
                setSelectedCardId(cards[newCardIndex].id);
                return;
            }
            
            // 处理左右方向键 - 将卡片移动到相邻列表
            setBoards(prevBoards => {
                const newBoards = JSON.parse(JSON.stringify(prevBoards));
                const board = newBoards.find(b => b.id === activeBoardId);
                if (!board) return prevBoards;

                const currentListIndex = board.lists.findIndex(l => l.id === selectedListId);
                if (currentListIndex === -1) return prevBoards;
                
                let targetListIndex = -1;
            
                if (board.lists[currentListIndex].title === 'Inbox') {
                    if (event.key === 'ArrowLeft') {
                        // 智能刷词：按左键时，当前卡片移到清单10（困难），当前卡片上方的所有卡片移到清单9（容易）
                        targetListIndex = 1; // '10'
                        
                        const sourceList = board.lists[currentListIndex];
                        const hardList = board.lists[1]; // 清单10
                        const easyList = board.lists[2]; // 清单9
                        const cardIndex = sourceList.cards.findIndex(c => c.id === selectedCardId);
                        
                        if (cardIndex > -1) {
                            event.preventDefault();
                            
                            // 1. 获取当前卡片和其上方的所有卡片
                            const currentCard = sourceList.cards[cardIndex];
                            const cardsAbove = sourceList.cards.slice(0, cardIndex);
                            
                            // 2. 从源列表中删除当前卡片和其上方的卡片
                            sourceList.cards = sourceList.cards.slice(cardIndex + 1);
                            
                            // 3. 将当前卡片移到困难列表（清单10）
                            hardList.cards.unshift(currentCard);
                            
                            // 4. 将上方卡片移到容易列表（清单9），保持原有顺序
                            if (cardsAbove.length > 0) {
                                // 反转顺序后添加，确保原顺序在目标列表中保持不变
                                for (let i = cardsAbove.length - 1; i >= 0; i--) {
                                    easyList.cards.unshift(cardsAbove[i]);
                                }
                            }
                            
                            // 5. 选择源列表中的下一张卡片
                            let nextSelectedCardId = sourceList.cards.length > 0 
                                ? sourceList.cards[0].id 
                                : null;
                            
                            setSelectedCardId(nextSelectedCardId);
                            if(!nextSelectedCardId) setSelectedListId(null);
                            
                            // 增加进度，按照移动的卡片总数
                            const movedCardsCount = 1 + cardsAbove.length;
                            // 一次性增加所有移动的卡片数量
                            incrementProgressByAmount(movedCardsCount);
                            
                            return newBoards;
                        }
                    }
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

    const handleExportData = () => {
        // 准备要导出的数据
        const dataToExport = { 
            boards, 
            activeBoardId, 
            dailyGoal, 
            dailyProgress,
            exportDate: new Date().toISOString()
        };
        
        // 创建Blob并下载
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
        a.href = url;
        a.download = `flashcards-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('备份文件已成功导出！');
    };

    const handleImportData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // 验证导入的数据格式
                if (!importedData.boards || !Array.isArray(importedData.boards)) {
                    throw new Error('无效的备份文件格式');
                }
                
                // 使用确认对话框
                const backupDate = new Date(importedData.exportDate || '').toLocaleString();
                const boardCount = importedData.boards.length;
                const wordCount = importedData.boards.reduce((total, board) => {
                    return total + board.lists.reduce((boardTotal, list) => boardTotal + list.cards.length, 0);
                }, 0);
                
                setConfirmation({
                    isOpen: true,
                    message: `确定要导入此备份文件吗？这将覆盖当前的所有数据。\n\n备份日期: ${backupDate}\n看板数量: ${boardCount}\n单词总数: ${wordCount}`,
                    onConfirm: () => {
                        // 设置导入的数据
                        setBoards(importedData.boards);
                        setActiveBoardId(importedData.activeBoardId);
                        setDailyGoal(importedData.dailyGoal || 500);
                        
                        // 处理日进度数据
                        const today = getTodayDateString();
                        if (importedData.dailyProgress && importedData.dailyProgress.date === today) {
                            setDailyProgress(importedData.dailyProgress);
                        } else {
                            setDailyProgress({ count: 0, date: today });
                        }
                        
                        // 保存到存储
                        const dataToSave = {
                            boards: importedData.boards,
                            activeBoardId: importedData.activeBoardId,
                            dailyGoal: importedData.dailyGoal || 500,
                            dailyProgress: importedData.dailyProgress && importedData.dailyProgress.date === today 
                                ? importedData.dailyProgress 
                                : { count: 0, date: today },
                            lastUpdated: new Date().toISOString()
                        };
                        
                        saveToLocalStorage(dataToSave);
                        
                        // 如果使用Firebase，同时保存到云端
                        if (storageType === 'firebase' && db) {
                            const docRef = doc(db, 'public-boards', 'shared-board-data');
                            setDoc(docRef, dataToSave, { merge: true })
                                .catch(e => console.error("Error saving imported data to Firebase:", e));
                        }
                        
                        alert('数据已成功导入！');
                        setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
                    },
                    onCancel: () => {
                        setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
                    }
                });
            } catch (error) {
                console.error('导入数据时出错:', error);
                alert('导入失败: ' + (error.message || '无效的备份文件'));
            }
            
            // 重置文件输入，以便用户可以再次选择同一文件
            event.target.value = '';
        };
        
        reader.readAsText(file);
    };

    // 添加加载HSK3000词汇表的函数
    const loadHSK3000 = async () => {
        try {
            // 使用简短文件名
            const response = await fetch('/hsk3000.txt');
            const text = await response.text();
            console.log(`HSK文件总行数: ${text.split('\n').length}`);
            
            let failedLines = 0;
            const cards = text
                .split('\n')
                // .slice(1) // 不跳过第一行，因为它不是标题行
                .map((line, index) => {
                    // 如果行为空，则跳过
                    if (!line.trim()) {
                        console.log(`第${index+1}行为空行`);
                        failedLines++;
                        return null;
                    }
                    
                    const parts = line.split('\t'); // 使用制表符分隔
                    
                    // 只提取汉字和拼音
                    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                        return {
                            id: generateId(),
                            word: parts[0].trim(), // 汉字
                            definition: parts[1].trim() // 拼音
                        };
                    }
                    
                    console.log(`第${index+1}行解析失败: ${line}`);
                    failedLines++;
                    return null;
                })
                .filter(Boolean);
                
            console.log(`成功解析HSK单词数: ${cards.length}, 解析失败: ${failedLines}`);
            return cards;
        } catch (error) {
            console.error("加载HSK3000词汇表出错:", error);
            throw error; // 重新抛出错误，让调用者处理
        }
    };

    // 添加加载TOPIK初级词汇表的函数
    const loadTOPIK1560 = async () => {
        try {
            const response = await fetch('/TOPIK初级I必背单词1560词.txt');
            const text = await response.text();
            console.log(`TOPIK文件总行数: ${text.split('\n').length}`);
            
            let failedLines = 0;
            const cards = text
                .split('\n')
                .map((line, index) => {
                    // 如果行为空，则跳过
                    if (!line.trim()) {
                        console.log(`第${index+1}行为空行`);
                        failedLines++;
                        return null;
                    }
                    
                    const parts = line.split('\t'); // 使用制表符分隔
                    
                    // 只提取韩语单词和汉语释义（前两列）
                    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                        return {
                            id: generateId(),
                            word: parts[0].trim(), // 韩语单词
                            definition: parts[1].trim() // 汉语释义
                        };
                    }
                    
                    console.log(`第${index+1}行解析失败: ${line}`);
                    failedLines++;
                    return null;
                })
                .filter(Boolean);
                
            console.log(`成功解析TOPIK单词数: ${cards.length}, 解析失败: ${failedLines}`);
            return cards;
        } catch (error) {
            console.error("加载TOPIK初级词汇表出错:", error);
            throw error; // 重新抛出错误，让调用者处理
        }
    };

    // 添加随机排序Inbox中单词的函数
    const handleRandomizeInbox = (boardId) => {
        setBoards(currentBoards => {
            const newBoards = [...currentBoards];
            const boardIndex = newBoards.findIndex(b => b.id === boardId);
            
            if (boardIndex === -1) return currentBoards;
            
            const board = {...newBoards[boardIndex]};
            const lists = [...board.lists];
            
            // 查找Inbox列表
            const inboxIndex = lists.findIndex(list => list.title === 'Inbox');
            
            if (inboxIndex === -1 || lists[inboxIndex].cards.length <= 1) {
                alert('Inbox中没有足够的单词可以排序！');
                return currentBoards;
            }
            
            // 创建Inbox列表的副本
            const inboxList = {...lists[inboxIndex]};
            
            // 对Inbox列表的卡片进行随机排序 (Fisher-Yates洗牌算法)
            const shuffledCards = [...inboxList.cards];
            for (let i = shuffledCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
            }
            
            // 更新Inbox列表的卡片
            inboxList.cards = shuffledCards;
            lists[inboxIndex] = inboxList;
            
            // 更新board和boards
            board.lists = lists;
            newBoards[boardIndex] = board;
            
            // 保存到存储
            const dataToSave = {
                boards: newBoards,
                activeBoardId: activeBoardId,
                dailyGoal: dailyGoal,
                dailyProgress: dailyProgress,
                lastUpdated: new Date().toISOString()
            };
            
            if (storageType === 'local') {
                saveToLocalStorage(dataToSave);
            } else if (db) {
                const docRef = doc(db, 'public-boards', 'shared-board-data');
                setDoc(docRef, dataToSave, { merge: true })
                    .catch(e => console.error("Error updating Firebase:", e));
            }
            
            return newBoards;
        });
    };

    // 添加处理编辑卡片的函数
    const handleEditCard = (card) => {
        setCardToEdit(card);
        setIsEditCardModalOpen(true);
    };
    
    // 添加保存编辑卡片的函数
    const handleSaveCard = (editedCard) => {
        // 更新boards状态
        setBoards(currentBoards => {
            const newBoards = [...currentBoards];
            const boardIndex = newBoards.findIndex(b => b.id === activeBoardId);
            
            if (boardIndex === -1) return currentBoards;
            
            const board = {...newBoards[boardIndex]};
            const newLists = board.lists.map(list => {
                // 查找卡片并更新
                const cardIndex = list.cards.findIndex(c => c.id === editedCard.id);
                if (cardIndex === -1) return list;
                
                const newCards = [...list.cards];
                newCards[cardIndex] = editedCard;
                
                return {...list, cards: newCards};
            });
            
            board.lists = newLists;
            newBoards[boardIndex] = board;
            
            return newBoards;
        });
    };

    // 添加处理删除卡片的函数
    const handleDeleteCard = (card) => {
        setConfirmation({
            isOpen: true,
            message: `确定要删除此卡片吗？\n\n单词：${card.word}\n释义：${card.definition || '无'}`,
            onConfirm: () => {
                // 更新boards状态
                setBoards(currentBoards => {
                    const newBoards = [...currentBoards];
                    const boardIndex = newBoards.findIndex(b => b.id === activeBoardId);
                    
                    if (boardIndex === -1) return currentBoards;
                    
                    const board = {...newBoards[boardIndex]};
                    const newLists = board.lists.map(list => {
                        // 过滤掉要删除的卡片
                        const newCards = list.cards.filter(c => c.id !== card.id);
                        return {...list, cards: newCards};
                    });
                    
                    board.lists = newLists;
                    newBoards[boardIndex] = board;
                    
                    return newBoards;
                });
                
                // 如果正在删除的卡片是当前选中的卡片，则取消选中
                if (selectedCardId === card.id) {
                    setSelectedCardId(null);
                    setSelectedListId(null);
                }
                
                setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
            }
        });
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
            <EditCardModal isOpen={isEditCardModalOpen} card={cardToEdit} onClose={() => setIsEditCardModalOpen(false)} onSave={handleSaveCard} />

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
                        {boards.map(board => {
                            // 计算单词总数
                            const wordCount = board.lists.reduce((total, list) => total + list.cards.length, 0);
                            // 确保这些样式类在生产环境中不会被优化掉
                            const countLabelClasses = "text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full";
                            
                            return (
                                <div key={board.id} onClick={() => handleBoardChange(board.id)} className={`group p-2 rounded-md cursor-pointer transition-colors ${activeBoardId === board.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">{board.name}</span>
                                        <span className={countLabelClasses}>
                                            {wordCount}词
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleRenameBoard(board.id, board.name); }} className="text-xs text-gray-400 hover:text-white">重命名</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }} className="text-xs text-red-500 hover:text-red-400">删除</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleRandomizeInbox(board.id); }} className="text-xs text-yellow-500 hover:text-yellow-400">随机排序</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 space-y-2">
                        <button onClick={() => setIsModalOpen(true)} className="w-full p-2 bg-blue-600 rounded-md hover:bg-blue-500 transition-colors font-semibold">
                            + 创建新看板
                        </button>
                        <div className="flex space-x-2">
                            <button 
                                onClick={handleExportData} 
                                className="flex-1 p-2 bg-green-600 rounded-md hover:bg-green-500 transition-colors font-semibold"
                            >
                                导出备份
                            </button>
                            <button 
                                onClick={() => document.getElementById('import-file').click()} 
                                className="flex-1 p-2 bg-purple-600 rounded-md hover:bg-purple-500 transition-colors font-semibold"
                            >
                                导入备份
                            </button>
                            <input 
                                id="import-file" 
                                type="file" 
                                accept=".json" 
                                onChange={handleImportData} 
                                className="hidden" 
                            />
                        </div>
                    </div>
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
            
            <DefinitionTooltip 
                definition={selectedCard?.definition} 
                selectedCard={selectedCard} 
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
            />
        </div>
    );
};

export default App;
