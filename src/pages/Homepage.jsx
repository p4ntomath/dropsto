import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import dropstoLogo from '/dropstoLogoNoText.png'
import potIcon from '../assets/potIcon.png'

function Homepage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [bucketFilter, setBucketFilter] = useState('all') // 'all', 'owned', 'shared'
  const [buckets, setBuckets] = useState([]) // Start with empty buckets array
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBucket, setNewBucket] = useState({
    name: '',
    description: '',
    color: 'from-blue-500 to-cyan-500',
    preview: 'folder'
  })

  const colorOptions = [
    { name: 'Blue', value: 'from-blue-500 to-cyan-500' },
    { name: 'Purple', value: 'from-purple-500 to-pink-500' },
    { name: 'Green', value: 'from-green-500 to-blue-500' },
    { name: 'Orange', value: 'from-orange-500 to-red-500' },
    { name: 'Indigo', value: 'from-indigo-500 to-purple-500' },
    { name: 'Gray', value: 'from-gray-500 to-slate-600' }
  ]

  const iconOptions = [
    { name: 'Folder', value: 'folder' },
    { name: 'Document', value: 'document' },
    { name: 'Image', value: 'image' },
    { name: 'Video', value: 'video' },
    { name: 'Briefcase', value: 'briefcase' },
    { name: 'Database', value: 'database' }
  ]

  // Create new bucket function
  const createBucket = () => {
    if (newBucket.name.trim()) {
      const bucket = {
        id: Date.now(), // Simple ID generation
        name: newBucket.name.trim(),
        description: newBucket.description.trim() || 'No description provided',
        type: 'bucket',
        items: 0,
        size: '0 KB',
        preview: newBucket.preview,
        collaborators: ['user'],
        color: newBucket.color,
        owner: 'me',
        isOwned: true,
        createdAt: new Date().toISOString()
      }
      
      const updatedBuckets = [bucket, ...buckets]
      setBuckets(updatedBuckets)
      
      // Save to localStorage for persistence
      localStorage.setItem('dropsto-buckets', JSON.stringify(updatedBuckets))
      
      setShowCreateModal(false)
      setNewBucket({
        name: '',
        description: '',
        color: 'from-blue-500 to-cyan-500',
        preview: 'folder'
      })
    }
  }

  // Delete bucket function
  const deleteBucket = (bucketId) => {
    setBuckets(prev => prev.filter(bucket => bucket.id !== bucketId))
  }

  const sidebarItems = [
    { name: 'Home', icon: 'home', active: true },
    { name: 'My buckets', icon: 'pot', count: buckets.filter(b => b.isOwned).length },
    { name: 'Shared buckets', icon: 'share', count: buckets.filter(b => !b.isOwned).length }
  ]

  const tabs = ['Recent', 'Favorites', 'Shared']

  // Filter buckets based on ownership
  const filteredBuckets = buckets.filter(bucket => {
    if (bucketFilter === 'owned') return bucket.isOwned
    if (bucketFilter === 'shared') return !bucket.isOwned
    return true // 'all'
  })

  const quickActions = [
    { name: 'Create new bucket', icon: 'pot', action: () => setShowCreateModal(true) },
    { name: 'Upload files', icon: 'upload', action: () => {} },
    { name: 'Share bucket', icon: 'link', action: () => {} },
    { name: 'Import bucket', icon: 'folder', action: () => {} }
  ]

  // Icon component helper
  const getIcon = (iconName, className = "w-5 h-5") => {
    if (iconName === 'pot') {
      return <img src={potIcon} alt="Pot Icon" className={className} />
    }
    
    const icons = {
      home: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      bucket: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      share: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      ),
      document: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      image: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      briefcase: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2a2 2 0 01-2 2H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
        </svg>
      ),
      video: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      palette: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5a2 2 0 00-2 2v12a4 4 0 004 4h2a2 2 0 002-2V5a2 2 0 00-2-2z" />
        </svg>
      ),
      database: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      upload: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      link: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      phone: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
        </svg>
      ),
      chart: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      users: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      settings: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      trash: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      folder: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    }
    return icons[iconName] || icons.folder
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img 
              src={dropstoLogo}
              alt="DropSto Logo" 
              className="w-8 h-8 object-contain"
            />
            <div>
              <div className="font-bold text-gray-900">DropSto</div>
              <div className="text-xs text-gray-500">Bucket Storage</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getIcon(item.icon)}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.count && (
                  <span className="text-sm text-gray-400">{item.count}</span>
                )}
              </div>
            ))}
            
            {/* Additional Actions - now part of main navigation */}
            <div className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
              <span className="text-lg">{getIcon('users')}</span>
              <span className="font-medium">Manage access</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search buckets and files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Mahlatse Rabothata</span>
                <button className="text-gray-400">{getIcon('settings')}</button>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Actions */}
        <div className="px-8 py-6 bg-white border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{getIcon(action.icon, "w-8 h-8")}</span>
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">{action.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Storage Buckets</h2>
            <div className="flex items-center space-x-4">
              {/* Ownership Filter */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setBucketFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    bucketFilter === 'all' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({buckets.length})
                </button>
                <button
                  onClick={() => setBucketFilter('owned')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    bucketFilter === 'owned' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Owned ({buckets.filter(b => b.isOwned).length})
                </button>
                <button
                  onClick={() => setBucketFilter('shared')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    bucketFilter === 'shared' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Shared ({buckets.filter(b => !b.isOwned).length})
                </button>
              </div>
              
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>{getIcon('pot', "w-5 h-5")}</span>
                <span>Create Bucket</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 mb-6 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Storage Usage Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 mb-8 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
                <p className="text-sm text-gray-600">
                  {buckets.reduce((total, bucket) => {
                    const sizeNum = parseFloat(bucket.size.split(' ')[0]) || 0
                    const unit = bucket.size.split(' ')[1]
                    return total + (unit === 'MB' ? sizeNum : sizeNum / 1024)
                  }, 0).toFixed(1)} MB used of 30 MB available
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((buckets.reduce((total, bucket) => {
                    const sizeNum = parseFloat(bucket.size.split(' ')[0]) || 0
                    const unit = bucket.size.split(' ')[1]
                    return total + (unit === 'MB' ? sizeNum : sizeNum / 1024)
                  }, 0) / 30) * 100)}%
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((buckets.reduce((total, bucket) => {
                        const sizeNum = parseFloat(bucket.size.split(' ')[0]) || 0
                        const unit = bucket.size.split(' ')[1]
                        return total + (unit === 'MB' ? sizeNum : sizeNum / 1024)
                      }, 0) / 30) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State or Buckets Grid */}
          {filteredBuckets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                {getIcon('pot', "w-12 h-12 text-gray-400")}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {bucketFilter === 'all' ? 'No buckets yet' : `No ${bucketFilter} buckets`}
              </h3>
              <p className="text-gray-500 mb-6">
                {bucketFilter === 'all' 
                  ? 'Create your first storage bucket to get started' 
                  : `You don't have any ${bucketFilter} buckets yet`
                }
              </p>
              {bucketFilter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                >
                  <span>Create Your First Bucket</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBuckets.map((bucket) => (
                <motion.div
                  key={bucket.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group relative"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Ownership indicator */}
                  <div className="absolute top-4 right-4 flex items-center space-x-1">
                    {bucket.isOwned ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Owned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Shared
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${bucket.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                      {getIcon(bucket.preview, "w-6 h-6")}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1">{bucket.name}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{bucket.description}</p>
                  
                  {/* Owner info for shared buckets */}
                  {!bucket.isOwned && (
                    <p className="text-xs text-gray-400 mb-3">
                      Owned by {bucket.owner}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Created {new Date(bucket.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => navigate(`/bucket/${bucket.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Open bucket
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Bucket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Bucket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Bucket Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bucket Name
                </label>
                <input
                  type="text"
                  value={newBucket.name}
                  onChange={(e) => setNewBucket(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter bucket name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newBucket.description}
                  onChange={(e) => setNewBucket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter bucket description"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewBucket(prev => ({ ...prev, color: color.value }))}
                      className={`w-full h-10 bg-gradient-to-r ${color.value} rounded-lg border-2 transition-all ${
                        newBucket.color === color.value 
                          ? 'border-gray-800 scale-105' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon.value}
                      onClick={() => setNewBucket(prev => ({ ...prev, preview: icon.value }))}
                      className={`w-full h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        newBucket.preview === icon.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                      title={icon.name}
                    >
                      {getIcon(icon.value, "w-5 h-5")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createBucket}
                disabled={!newBucket.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Create Bucket</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Homepage