package com.timestored.kdb.examples;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.GraphicsEnvironment;
import java.io.IOException;
import java.lang.reflect.Array;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.swing.JFrame;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.table.AbstractTableModel;
import com.kx.c;

/**
 * Send table query to local q server and display the results.
 */
public class TableQueryExample {

    
    public static class KxTableModel extends AbstractTableModel {
        private c.Flip flip;
        public void setFlip(c.Flip data) {
            this.flip = data;
        }

        public int getRowCount() {
            return Array.getLength(flip.y[0]);
        }

        public int getColumnCount() {
            return flip.y.length;
        }

        public Object getValueAt(int rowIndex, int columnIndex) {
            return c.at(flip.y[columnIndex], rowIndex);
        }

        public String getColumnName(int columnIndex) {
            return flip.x[columnIndex];
        }
    };

    /** Print the column names and the first rows of the table to the console. */
    public static void printTable(KxTableModel model, int maxRows) {
        StringBuilder sb = new StringBuilder();
        for (int col = 0; col < model.getColumnCount(); col++) {
            sb.append(String.format("%-14s", model.getColumnName(col)));
        }
        System.out.println(sb.toString().trim());
        for (int row = 0; row < Math.min(maxRows, model.getRowCount()); row++) {
            sb.setLength(0);
            for (int col = 0; col < model.getColumnCount(); col++) {
                Object value = model.getValueAt(row, col);
                String text = value instanceof Double ? String.format("%.4f", value) : String.valueOf(value);
                sb.append(String.format("%-14s", text));
            }
            System.out.println(sb.toString().trim());
        }
        System.out.println(model.getRowCount() + " rows");
    }

    public static void main(String[] args) {
        c.Flip tableResult = null;
        c c = null;
        try {
        	// create connection to server
            c = new c("localhost", 5001,"username:password");
            final String TAB_Q = "([]date:2000.01.01+til n; time:.z.T; sym:n?`8; price:`float$n?500.0; size:(n:100)?100)";
            // if argument supplied use it as query, otherwise use default table.
            String query = (args!=null && args.length>0) ? args[0] : TAB_Q;
            
            tableResult = (c.Flip) c.k(query);
        } catch (Exception ex) {
            Logger.getLogger(TableQueryExample.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            if (c != null) {try{c.close();} catch (IOException ex) {}
          }
        }
        
        if (tableResult == null) {
            return;
        }
        KxTableModel model = new KxTableModel();
        model.setFlip(tableResult);
        printTable(model, 5);
        if (GraphicsEnvironment.isHeadless()) {
            return;
        }

        // Create GUI to display data in table.
        JTable table = new JTable(model);
        table.setGridColor(Color.BLACK);
        String title = "kdb+ Example - "+model.getRowCount()+" Rows";
        JFrame frame = new JFrame(title);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.getContentPane().add(new JScrollPane(table), BorderLayout.CENTER);
        frame.setSize(300, 300);
        frame.setVisible(true);
    }
}
