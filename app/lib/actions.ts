'use server';

import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        required_error: 'Please select a customer.',
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        required_error: 'Please select an invoice status.',
    }),
    date: z.string(),
  });
   
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(_prevState: State, formData: FormData) {
    try {
        const rowData = Object.fromEntries(formData.entries())

         // Validate form fields using Zod
        const validatedFields = CreateInvoice.safeParse(rowData);

        // If form validation fails, return errors early. Otherwise, continue.
        if (!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: 'Missing Fields. Failed to Create Invoice.',
            };
        }

        const { customerId, amount, status } = CreateInvoice.parse(rowData)
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];
    
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
        revalidatePath('/dashboard/invoices');
    } catch (e) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
    // Clear the default cache and trigger a new request to the server
    redirect('/dashboard/invoices');
}

export async function updateInvoice(_previous: State, formData: FormData, id: string) {
    try {
        const rowData = Object.fromEntries(formData.entries())
        const validatedFields = CreateInvoice.safeParse(rowData);

        if (!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: 'Missing Fields. Failed to Create Invoice.',
            };
        }

        const { customerId, amount, status } = CreateInvoice.parse(rowData)
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];

        await sql`
            UPDATE invoices
            SET customer_id=${customerId}, amount=${amountInCents}, status=${status}, date=${date}
            WHERE id=${id}
        `;
        revalidatePath('/dashboard/invoices');
    } catch (e) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        };
    }

    redirect('/dashboard/invoices');
}

export async function deleteInvoiceById (id: string) {
    try {
        await sql`
            DELETE FROM invoices
            WHERE id=${id}
        `;
        revalidatePath('/dashboard/invoices');
    } catch (e) {
        return {
            message: 'Database Error: Failed to delete Invoice.',
        };
    }
}