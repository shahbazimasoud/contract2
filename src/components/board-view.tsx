
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from "react-beautiful-dnd";
import { PlusCircle, MoreHorizontal, Check, Edit, Calendar as CalendarIcon, MessageSquare, Paperclip, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";
import type { Task, User, TaskBoard, BoardPermissionRole, BoardColumn } from '@/lib/types';

interface BoardViewProps {
  activeBoard: TaskBoard;
  filteredTasks: Task[];
  userPermissions: BoardPermissionRole | 'owner' | 'none';
  onDragEnd: (result: DropResult) => void;
  handleOpenTaskDialog: (task: Task | null, columnId?: string) => void;
  handleOpenDetailsSheet: (task: Task) => void;
  handleToggleTaskCompletion: (taskId: string, isCompleted: boolean) => void;
  usersOnBoard: User[];
  differenceInDays: (dateLeft: Date | number, dateRight: Date | number) => number;
  formatDate: (date: Date | number, formatStr: string) => string;
  t: (key: string, options?: { [key: string]: string | number }) => string;
  showAddColumnForm: boolean;
  setShowAddColumnForm: (show: boolean) => void;
  newColumnFormRef: React.RefObject<HTMLFormElement>;
  columnForm: any; // Simplified for brevity
  handleAddColumn: (values: { title: string }) => void;
  editingColumnId: string | null;
  editingColumnTitle: string;
  setEditingColumnTitle: (title: string) => void;
  handleEditColumnTitle: (columnId: string, currentTitle: string) => void;
  handleSaveColumnTitle: (columnId: string) => void;
  handleOpenCopyColumnDialog: (column: BoardColumn) => void;
  handleOpenMoveColumnDialog: (column: BoardColumn) => void;
  handleArchiveColumn: (columnId: string) => void;
}

const BoardView: React.FC<BoardViewProps> = ({
  activeBoard,
  filteredTasks,
  userPermissions,
  onDragEnd,
  handleOpenTaskDialog,
  handleOpenDetailsSheet,
  handleToggleTaskCompletion,
  usersOnBoard,
  differenceInDays,
  formatDate,
  t,
  showAddColumnForm,
  setShowAddColumnForm,
  newColumnFormRef,
  columnForm,
  handleAddColumn,
  editingColumnId,
  editingColumnTitle,
  setEditingColumnTitle,
  handleEditColumnTitle,
  handleSaveColumnTitle,
  handleOpenCopyColumnDialog,
  handleOpenMoveColumnDialog,
  handleArchiveColumn,
}) => {
  const renderTaskCard = (task: Task) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(task.dueDate);
    const daysToDue = differenceInDays(dueDate, today);

    let dueDateColor = "text-muted-foreground";
    if (!task.isCompleted) {
        if (daysToDue < 0) dueDateColor = "text-red-500";
        else if (daysToDue < 7) dueDateColor = "text-orange-500";
    }
    
    const assigneesToShow = task.assignees?.slice(0, 3) || [];
    const hiddenAssigneesCount = (task.assignees?.length || 0) - assigneesToShow.length;

    return (
         <Card
            className={cn(
                "mb-2 cursor-pointer transition-shadow hover:shadow-md bg-card group/taskcard relative",
                 task.isCompleted && "border-l-4 border-green-500 opacity-70"
            )}
            onClick={() => handleOpenDetailsSheet(task)}
        >
            <CardContent className="p-3">
                <div className="flex items-start gap-3">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskCompletion(task.id, !task.isCompleted);
                        }}
                        className={cn(
                            "mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                            task.isCompleted ? "bg-green-500 border-green-700" : "border-muted-foreground/50 hover:border-primary"
                        )}
                    >
                        <Check className={cn("h-4 w-4 text-white transform transition-transform", task.isCompleted ? "animate-check-pop scale-100" : "scale-0")} />
                    </button>

                    <div className="flex-1 min-w-0">
                         {(task.labelIds && task.labelIds.length > 0) && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {task.labelIds.map(labelId => {
                                    const label = activeBoard?.labels?.find(l => l.id === labelId);
                                    if (!label) return null;
                                    return (
                                        <Badge key={label.id} style={{ backgroundColor: label.color, color: '#fff' }} className="text-xs px-2 py-0.5 border-transparent">
                                            {label.text}
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                        <p className="font-semibold text-sm text-card-foreground break-words">{task.title}</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTaskDialog(task, task.columnId);
                        }}
                        className="absolute top-1 right-1 h-7 w-7 rounded-md flex items-center justify-center transition-opacity opacity-0 group-hover/taskcard:opacity-100 hover:bg-muted"
                    >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                
                <div className="flex items-end justify-between mt-3 pl-8">
                     <div className="flex items-center -space-x-2">
                        <TooltipProvider>
                            {assigneesToShow.map(id => {
                                const user = usersOnBoard.find(u => u.id === id);
                                return user ? (
                                    <Tooltip key={id}><TooltipTrigger asChild>
                                        <Avatar className="h-6 w-6 border-2 border-background">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger><TooltipContent><p>{t('tasks.tooltips.assigned_to', { name: user.name })}</p></TooltipContent></Tooltip>
                                ) : null;
                            })}
                            {hiddenAssigneesCount > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                         <Avatar className="h-6 w-6 border-2 border-background">
                                            <AvatarFallback>+{hiddenAssigneesCount}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{(task.assignees || []).slice(3).map(id => usersOnBoard.find(u => u.id === id)?.name).join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(task.comments?.length || 0) > 0 && (
                             <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{task.comments?.length}</span>
                        )}
                        {(task.attachments?.length || 0) > 0 && (
                            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{task.attachments?.length}</span>
                        )}
                        {(task.checklist?.length || 0) > 0 && (
                             <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{task.checklist?.filter(c => c.completed).length}/{task.checklist?.length}</span>
                        )}
                         <span className={cn("flex items-center gap-1", dueDateColor)}>
                            <CalendarIcon className="h-3 w-3" />
                            {formatDate(new Date(task.dueDate), 'MMM d')}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-4 items-start overflow-x-auto pb-4">
                    {activeBoard.columns.filter(c => !c.isArchived).map((column, index) => (
                        <Draggable key={column.id} draggableId={column.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} className="w-80 flex-shrink-0">
                                    <div className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg">
                                        <div {...provided.dragHandleProps} className="flex items-center justify-between p-2 cursor-grab" onDoubleClick={() => handleEditColumnTitle(column.id, column.title)}>
                                            {editingColumnId === column.id ? (
                                                <Input 
                                                    value={editingColumnTitle}
                                                    onChange={(e) => setEditingColumnTitle(e.target.value)}
                                                    onBlur={() => handleSaveColumnTitle(column.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveColumnTitle(column.id);
                                                        if (e.key === 'Escape') setEditingColumnId(null);
                                                    }}
                                                    autoFocus
                                                    className="h-8"
                                                />
                                            ) : (
                                                <h3 className="font-semibold">{column.title}</h3>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="text-muted-foreground"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleOpenCopyColumnDialog(column)}>{t('tasks.board.copy_list')}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenMoveColumnDialog(column)} disabled={activeBoard.columns.filter(c => !c.isArchived).length <= 1}>{t('tasks.board.move_list')}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleArchiveColumn(column.id)}>{t('tasks.board.archive_list')}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <Droppable droppableId={column.id} type="TASK">
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[100px] p-2 rounded-md transition-colors", snapshot.isDraggingOver ? "bg-secondary" : "")}>
                                                    {(column.taskIds || []).map((taskId, index) => {
                                                        const task = filteredTasks.find(t => t.id === taskId);
                                                        if (!task) return null;
                                                        return (
                                                            <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={userPermissions === 'viewer'}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn(snapshot.isDragging && 'opacity-80 shadow-lg')}>
                                                                        {renderTaskCard(task)}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                        <Button variant="ghost" className="w-full justify-start mt-2" onClick={() => handleOpenTaskDialog(null, column.id)} disabled={userPermissions === 'viewer'}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_new_task')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                    {userPermissions !== 'viewer' && (
                        <div className="w-80 flex-shrink-0">
                            {showAddColumnForm ? (
                                <form ref={newColumnFormRef} onSubmit={columnForm.handleSubmit(handleAddColumn)} className="bg-muted/60 dark:bg-slate-800/60 p-2 rounded-lg space-y-2">
                                    <Input {...columnForm.register('title')} placeholder={t('tasks.board.enter_list_title')} autoFocus />
                                    <div className="flex items-center gap-2">
                                        <Button type="submit">{t('tasks.board.add_list')}</Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddColumnForm(false)}><MoreHorizontal /></Button>
                                    </div>
                                </form>
                            ) : (
                                <Button variant="ghost" className="w-full bg-muted/50 dark:bg-slate-800/50" onClick={() => setShowAddColumnForm(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.board.add_another_list')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Droppable>
    </DragDropContext>
  );
};

export default BoardView;
