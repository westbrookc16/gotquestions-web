import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AudioRecording from "./audio";
import { useEffect } from "react";

const formSchema = z.object({
    question: z.string().nonempty("Question must be a string"),
});

interface QuestionInputProps {
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    updateQuestion: (text: string) => void;
    setIsLoading: (loading: boolean) => void;
    isLoading: boolean;
}

export default function QuestionInput({ onSubmit, updateQuestion, setIsLoading, isLoading }: QuestionInputProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            question: "",
        },
    });

    return (
        <div className="space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset({ question: "" });
                })} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="question"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-md">Ask your question</FormLabel>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <FormControl>
                                        <Input placeholder="Type your question here..." className="w-full rounded-md h-10" {...field} />
                                    </FormControl>
                                    <Button type="submit" className="w-full sm:w-auto rounded-md h-10">Submit Question</Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or use voice</span>
                </div>
            </div>

            <div className="flex justify-center">
                <AudioRecording isLoading={isLoading} updateQuestion={updateQuestion} setIsLoading={setIsLoading} />
            </div>
        </div>
    );
} 