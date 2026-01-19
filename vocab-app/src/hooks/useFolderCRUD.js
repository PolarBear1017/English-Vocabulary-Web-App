import { useCallback } from 'react';
import {
  createFolder as createFolderRecord,
  deleteFolder as deleteFolderRecord,
  deleteFolders as deleteFoldersRecord,
  updateFolder as updateFolderRecord
} from '../services/libraryService';

const useFolderCRUD = ({
  session,
  folders,
  setFolders,
  viewingFolderId,
  setViewingFolderId
}) => {
  const createFolder = useCallback(async ({ name, description }) => {
    const nextName = (name || '').trim();
    if (!nextName) {
      alert('資料夾名稱不能為空');
      return null;
    }
    const nextDescription = (description || '').trim();

    if (session?.user) {
      const payload = {
        name: nextName,
        description: nextDescription ? nextDescription : null,
        userId: session.user.id
      };
      const { data, error } = await createFolderRecord(payload);
      if (error) {
        let message = error.message;
        if (message.includes('column "description" of relation "folders" does not exist')) {
          message = '資料庫尚未更新。請新增 folders.description 欄位後再試。';
        }
        alert("建立資料夾失敗: " + message);
        return null;
      }
      const created = { ...data, id: data.id?.toString() };
      setFolders(prev => [...prev, created]);
      return created;
    }

    const created = {
      id: Date.now().toString(),
      name: nextName,
      description: nextDescription ? nextDescription : null,
      words: []
    };
    setFolders(prev => [...prev, created]);
    return created;
  }, [session, setFolders]);

  const handleDeleteFolder = useCallback(async (folderId) => {
    if (!confirm('確定刪除此資料夾？(資料夾內的單字不會被刪除，只會移除分類)')) return;

    if (session?.user && folderId !== 'default') {
      const { error } = await deleteFolderRecord(folderId);
      if (error) return alert("刪除失敗: " + error.message);
    }

    setFolders(prev => prev.filter(folder => folder.id !== folderId));
    if (viewingFolderId === folderId) setViewingFolderId(null);
  }, [session, setFolders, setViewingFolderId, viewingFolderId]);

  const handleDeleteFolders = useCallback(async (folderIds) => {
    const deletableIds = (Array.isArray(folderIds) ? folderIds : [])
      .map(id => id?.toString())
      .filter(id => id && id !== 'default');
    if (deletableIds.length === 0) return false;

    if (session?.user) {
      const { error } = await deleteFoldersRecord({
        folderIds: deletableIds,
        userId: session.user.id
      });
      if (error) {
        alert(`刪除失敗: ${error.message}`);
        return false;
      }
    }

    setFolders(prev => prev.filter(folder => !deletableIds.includes(folder.id)));
    if (viewingFolderId && deletableIds.includes(viewingFolderId)) {
      setViewingFolderId(null);
    }
    return true;
  }, [session, setFolders, setViewingFolderId, viewingFolderId]);

  const handleEditFolder = useCallback(async (folder, updates) => {
    if (!folder) return false;
    const nextName = (updates?.name || '').trim();
    const nextDescription = (updates?.description || '').trim();

    if (!nextName) {
      alert('資料夾名稱不能為空');
      return false;
    }

    const payload = {
      name: nextName,
      description: nextDescription ? nextDescription : null
    };

    if (session?.user && folder.id !== 'default') {
      const { data, error } = await updateFolderRecord({
        folderId: folder.id,
        userId: session.user.id,
        ...payload
      });
      if (error) {
        let message = error.message;
        if (message.includes('column "description" of relation "folders" does not exist')) {
          message = '資料庫尚未更新。請新增 folders.description 欄位後再試。';
        }
        alert('更新失敗: ' + message);
        return false;
      }

      setFolders(prev => prev.map(item => item.id === folder.id ? { ...item, ...data } : item));
      return true;
    }

    setFolders(prev => prev.map(item => item.id === folder.id ? { ...item, ...payload } : item));
    return true;
  }, [session, setFolders]);

  return {
    actions: {
      createFolder,
      handleDeleteFolder,
      handleDeleteFolders,
      handleEditFolder
    },
    state: {
      folders
    }
  };
};

export default useFolderCRUD;
