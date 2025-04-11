import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { createGame } from "@/lib/actions"
import { HandIcon as HandRock, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <HandRock className="h-8 w-8" />
            Rock Paper Scissors
          </CardTitle>
          <CardDescription>Challenge your friends to a game!</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="relative w-full h-64">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <HandRock className="h-24 w-24 text-primary animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <form action={createGame} className="w-full">
            <Button type="submit" className="w-full" size="lg">
              Create New Game
            </Button>
          </form>
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Play with friends online</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
