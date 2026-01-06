import { useEffect, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Calendar, Share2, Bookmark, ArrowLeft, Loader2, Heart } from "lucide-react"
import { getInteraction, saveInteraction } from "@/lib/db"

interface Post {
  id: number
  title: string
  body: string
  tags: string[]
  reactions: {
    likes: number
    dislikes: number
  }
  views: number
  userId: number
}

// Deterministic image mapping for stable PWA testing
const IMAGE_MAP: Record<number, string> = {
  1: "1501785888041-af3ef285b470", // gunung & kabut
  2: "1500530855697-b586d89ba3ee", // hutan pinus
  3: "1507525428034-b723cf961d3e", // laut & ombak
  4: "1502082553048-f009c37129b9", // danau & pegunungan
  5: "1499346030926-9a72daac6c63", // matahari terbit
  6: "1504196606672-aef5c9cefc92", // air terjun
  7: "1470770903676-69b98201ea1c", // langit & awan
  10: "1501785888041-af3ef285b470", // pedesaan alami / pegunungan
}

function App() {
  const [post, setPost] = useState<Post | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Stable ID: Always fetch ID 1 as the main article
  const MAIN_POST_ID = 1

  const fetchPost = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch Main Post
      const response = await fetch(`https://dummyjson.com/posts/${MAIN_POST_ID}`)
      if (!response.ok) throw new Error("Failed to fetch post")
      const data = await response.json()
      setPost(data)

      // Fetch interactions from IndexedDB
      const interaction = await getInteraction(MAIN_POST_ID.toString())
      if (interaction) {
        setIsLiked(interaction.liked)
        setIsBookmarked(interaction.bookmarked)
      } else {
        setIsLiked(false)
        setIsBookmarked(false)
      }

      // Fetch Related Posts (IDs 2, 3, 4)
      const relatedIds = [2, 3, 4]
      const relatedPromises = relatedIds.map(id =>
        fetch(`https://dummyjson.com/posts/${id}`).then(res => res.json())
      )
      const relatedData = await Promise.all(relatedPromises)
      setRelatedPosts(relatedData)

    } catch (err: any) {
      console.error("Failed to load content", err)
      setError(err.message || "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = async () => {
    if (!post) return
    const newState = !isLiked
    setIsLiked(newState)
    await saveInteraction(post.id.toString(), { liked: newState, bookmarked: isBookmarked })
  }

  const toggleBookmark = async () => {
    if (!post) return
    const newState = !isBookmarked
    setIsBookmarked(newState)
    await saveInteraction(post.id.toString(), { liked: isLiked, bookmarked: newState })
  }

  const getImageUrl = (id: number) => {
    const imgId = IMAGE_MAP[id] || IMAGE_MAP[1]
    return `https://images.unsplash.com/photo-${imgId}?w=800&auto=format&fit=crop&q=80`
  }

  useEffect(() => {
    fetchPost()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4 text-center">
        <p className="text-red-500 mb-4">{error || "Post not found"}</p>
        <Button onClick={fetchPost}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans transition-colors duration-300 pb-20">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-3xl">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBookmark}
              className={isBookmarked ? "text-yellow-500" : ""}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
              <span className="sr-only">Bookmark</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <article className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Article Header */}
          <header className="space-y-6">
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-balance">
                {post.title}
              </h1>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${post.userId}`} alt="User Avatar" />
                  <AvatarFallback>U{post.userId}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium leading-none">User #{post.userId}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-1">Author</p>
                </div>
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 flex flex-col items-end sm:flex-row sm:items-center sm:space-x-4">
                <div className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span>Jan 06, 2026</span>
                </div>
                <div className="flex items-center mt-1 sm:mt-0">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>{Math.max(1, Math.ceil(post.body.length / 500))} min read</span>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Image */}
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="aspect-video w-full bg-neutral-200 dark:bg-neutral-800 relative group">
              <img
                src={getImageUrl(post.id)}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </Card>

          {/* Article Body */}
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-400">
            <p className="lead">{post.body}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>

            <Separator className="my-8" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-neutral-500">
                <span>Views: <strong>{post.views}</strong></span>
              </div>
              <Button
                onClick={toggleLike}
                variant={isLiked ? "default" : "outline"}
                className={`gap-2 ${isLiked ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : ""}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "Liked" : "Like"}
              </Button>
            </div>
          </div>

        </article>

        <Separator className="my-12" />

        {/* Related Articles */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Related Articles</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map(related => (
              <Card key={related.id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="aspect-video w-full bg-neutral-100 dark:bg-neutral-800 relative">
                  <img
                    src={getImageUrl(related.id)}
                    alt={related.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="p-4">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">{related.tags[0]}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-lg leading-tight">
                    {related.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto">
                  <Button variant="link" className="px-0 h-auto font-semibold">Read more &rarr;</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-12 bg-white dark:bg-neutral-950 px-6">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center text-sm text-neutral-500">
          <p>&copy; 2026 PWA Research. Content from DummyJSON.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
