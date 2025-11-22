import { MessageSquare } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Выберите диалог</h3>
          <p className="text-sm text-muted-foreground">
            Выберите диалог из списка слева для начала общения с клиентом
          </p>
        </div>
      </div>
    </div>
  );
}
