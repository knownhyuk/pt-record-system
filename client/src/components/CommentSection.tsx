import { useState, useEffect } from 'react'
import { commentAPI } from '../api'
import type { Comment } from '../types'
import { formatDistance } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CommentSectionProps {
  sessionId: number
  trainerId: number
  role: 'trainer' | 'member'
}

function CommentSection({ sessionId, trainerId, role }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // 코멘트 섹션 열림/닫힘 상태

  // 코멘트 로드
  useEffect(() => {
    loadComments()
  }, [sessionId])

  const loadComments = async () => {
    try {
      const data = await commentAPI.getComments(sessionId, role)
      setComments(data)
    } catch (error) {
      console.error('코멘트 로드 실패:', error)
    }
  }

  // 코멘트 추가
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('코멘트 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      await commentAPI.createComment(sessionId, trainerId, newComment, isPublic)
      setNewComment('')
      setIsPublic(true)
      await loadComments()
    } catch (error) {
      console.error('코멘트 추가 실패:', error)
      alert('코멘트 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 코멘트 수정 시작
  const startEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setEditIsPublic(comment.isPublic)
  }

  // 코멘트 수정 저장
  const handleUpdateComment = async (commentId: number) => {
    if (!editContent.trim()) {
      alert('코멘트 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      await commentAPI.updateComment(commentId, trainerId, editContent, editIsPublic)
      setEditingId(null)
      await loadComments()
    } catch (error) {
      console.error('코멘트 수정 실패:', error)
      alert('코멘트 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 코멘트 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('이 코멘트를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    try {
      await commentAPI.deleteComment(commentId, trainerId)
      await loadComments()
    } catch (error) {
      console.error('코멘트 삭제 실패:', error)
      alert('코멘트 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl transition-all duration-300 border border-blue-200/50 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-sm">💬</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">
              코멘트
            </h3>
            {comments.length > 0 && (
              <p className="text-sm text-gray-600">
                {comments.length}개의 코멘트가 있습니다
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {comments.length > 0 && (
            <div className="px-3 py-1 bg-white/80 text-blue-700 rounded-full text-sm font-medium shadow-sm">
              {comments.length}
            </div>
          )}
          <div className={`w-8 h-8 rounded-full bg-white/80 flex items-center justify-center transition-all duration-300 ${
            isExpanded ? 'rotate-180 bg-blue-100' : 'hover:bg-blue-50'
          }`}>
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* 코멘트 섹션 내용 - 확장되었을 때만 표시 */}
      {isExpanded && (
        <>
          {/* 코멘트 목록 - 상단에 표시 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-2xl">💭</span>
                </div>
                <p className="text-gray-500 font-medium">아직 코멘트가 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">첫 번째 코멘트를 작성해보세요</p>
              </div>
            ) : (
              (Array.isArray(comments) ? comments : []).map(comment => (
                <div
                  key={comment.id}
                  className={`rounded-2xl p-5 transition-all duration-200 hover:shadow-md ${
                    comment.isPublic
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300/50'
                  }`}
                >
                  {editingId === comment.id ? (
                    // 수정 모드
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <span className="text-xs">✏️</span>
                        </div>
                        <h5 className="text-sm font-semibold text-gray-900">코멘트 수정</h5>
                      </div>
                      
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 bg-white/80 shadow-sm"
                        rows={3}
                        placeholder="코멘트 내용을 수정하세요..."
                      />
                      
                      <div className="flex items-center justify-center">
                        <div className="bg-gray-100 rounded-full p-1 flex">
                          <button
                            type="button"
                            onClick={() => setEditIsPublic(true)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              editIsPublic
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="text-base">🌐</span>
                            <span>공개</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditIsPublic(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              !editIsPublic
                                ? 'bg-white text-gray-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="text-base">🔒</span>
                            <span>비공개</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-all duration-200"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 shadow-md"
                        >
                          {loading ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            comment.isPublic
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                              : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}>
                            <span className="text-xs">
                              {comment.isPublic ? '🌐' : '🔒'}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            comment.isPublic
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}>
                            {comment.isPublic ? '공개 코멘트' : '비공개 코멘트'}
                          </span>
                        </div>
                        
                        {role === 'trainer' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(comment)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="수정"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50">
                        <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {formatDistance(new Date(comment.createdAt), new Date(), {
                            addSuffix: true,
                            locale: ko,
                          })}
                          {comment.updatedAt && ' (수정됨)'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span>💬</span>
                          <span>코멘트</span>
                        </div>
                      </div>
                    </div>
                  )}
            </div>
          ))
        )}
        </div>
        
        {/* 트레이너만 코멘트 작성 가능 - 하단에 표시 */}
        {role === 'trainer' && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 space-y-4 border border-gray-200/50 shadow-sm mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-xs">✍️</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">새 코멘트 작성</h4>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-gray-100 rounded-full p-1 flex">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isPublic
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-lg">🌐</span>
                    <span>공개</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      !isPublic
                        ? 'bg-white text-gray-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-lg">🔒</span>
                    <span>비공개</span>
                  </button>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {isPublic ? (
                    <>
                      <span className="text-blue-600 font-medium">🌐 공개 코멘트</span> - 회원이 볼 수 있습니다
                    </>
                  ) : (
                    <>
                      <span className="text-gray-600 font-medium">🔒 비공개 코멘트</span> - 나만 볼 수 있습니다
                    </>
                  )}
                </p>
              </div>
              
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="회원에 대한 코멘트를 작성해주세요..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 bg-white/80 shadow-sm"
                rows={3}
              />
              
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      저장 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>💾</span>
                      코멘트 추가
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}

export default CommentSection

